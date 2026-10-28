import { NextResponse } from 'next/server'
import { elGuard, bad, SUB_COLS } from '@/lib/emaillist/guard'
import { clip, normEmail, normTags } from '@/lib/emaillist/core'

/** Add one person by hand. The owner must confirm the person agreed to get email (consent record). */
export async function POST(req: Request) {
  const g = await elGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  const email = normEmail(b?.email)
  if (!email) return bad('Enter a valid email address.')
  if (b?.attest !== true) return bad('Please confirm this person agreed to get emails from you.')
  const row = { user_id: g.user.id, email, name: clip(b?.name, 200) || null, tags: normTags(b?.tags), status: 'subscribed', source: 'manual', consent: 'owner_attested', consent_detail: clip(b?.how, 280) || 'Added by hand' }
  const { data, error } = await g.db.from('el_subscribers').insert(row).select(SUB_COLS).single()
  if (error) return error.code === '23505' ? bad('That email is already on your list.', 409) : bad('Could not add that person.', 500)
  return NextResponse.json({ subscriber: data })
}

/** Edit name/tags, or unsubscribe someone (owners can never re-subscribe a person). */
export async function PATCH(req: Request) {
  const g = await elGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  const ids: string[] = Array.isArray(b?.ids) ? b.ids.filter((x: unknown) => typeof x === 'string' && /^[0-9a-f-]{36}$/i.test(x)).slice(0, 1000) : []
  if (!ids.length) return bad('Nothing selected.')
  const patch: Record<string, unknown> = {}
  if (typeof b?.name === 'string' && ids.length === 1) patch.name = clip(b.name, 200) || null
  if (b?.unsubscribe === true) patch.status = 'unsubscribed'
  if (b?.tags !== undefined && ids.length === 1) patch.tags = normTags(b.tags)
  if (typeof b?.addTag === 'string' || typeof b?.removeTag === 'string') {
    const { data: rows } = await g.db.from('el_subscribers').select('id,tags').in('id', ids)
    for (const r of rows || []) {
      const t = new Set<string>(r.tags); if (b.addTag) normTags([b.addTag]).forEach((x) => t.add(x)); if (b.removeTag) t.delete(normTags([b.removeTag])[0])
      await g.db.from('el_subscribers').update({ tags: [...t].slice(0, 20) }).eq('id', r.id)
    }
  }
  if (Object.keys(patch).length) {
    const { error } = await g.db.from('el_subscribers').update(patch).in('id', ids).neq('status', patch.status ?? '__none__')
    if (error) return bad('Could not save that change.', 500)
  }
  const { data: subscribers } = await g.db.from('el_subscribers').select(SUB_COLS).in('id', ids)
  return NextResponse.json({ ok: true, subscribers: subscribers || [] })
}

export async function DELETE(req: Request) {
  const g = await elGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  const ids: string[] = Array.isArray(b?.ids) ? b.ids.filter((x: unknown) => typeof x === 'string' && /^[0-9a-f-]{36}$/i.test(x)).slice(0, 1000) : []
  if (!ids.length) return bad('Nothing selected.')
  const { error } = await g.db.from('el_subscribers').delete().in('id', ids)
  if (error) return bad('Could not delete.', 500)
  return NextResponse.json({ ok: true })
}
