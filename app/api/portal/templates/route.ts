import { NextResponse } from 'next/server'
import { ptGuard, bad } from '@/lib/portal/guard'
import { MAX_TEMPLATES, cleanItems, isUuid } from '@/lib/portal/core'

/** Create or update a reusable checklist template. */
export async function POST(req: Request) {
  const g = await ptGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  const name = typeof b?.name === 'string' ? b.name.trim().slice(0, 80) : ''
  const items = cleanItems(b?.items)
  if (!name) return bad('Name the template.')
  if (!items) return bad('Every step needs a title, and links must start with https:// (up to 30 steps).')
  if (isUuid(b?.id)) {
    const { data } = await g.db.from('pt_templates').update({ name, items, updated_at: new Date().toISOString() }).eq('id', b.id).select('id, name, items').maybeSingle()
    return data ? NextResponse.json({ template: data }) : bad('Not found.', 404)
  }
  const { count } = await g.db.from('pt_templates').select('id', { count: 'exact', head: true })
  if ((count || 0) >= MAX_TEMPLATES) return bad(`Up to ${MAX_TEMPLATES} templates.`)
  const { data, error } = await g.db.from('pt_templates').insert({ user_id: g.user.id, name, items }).select('id, name, items').single()
  if (error) return bad('Could not save the template.')
  return NextResponse.json({ template: data })
}
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get('id'); if (!isUuid(id)) return bad('Not found.', 404)
  const g = await ptGuard(true); if (g.err) return g.err
  await g.db.from('pt_templates').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
