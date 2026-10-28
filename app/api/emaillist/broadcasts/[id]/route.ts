import { NextResponse } from 'next/server'
import { elGuard, bad, BROADCAST_COLS } from '@/lib/emaillist/guard'
import { clip, normTag } from '@/lib/emaillist/core'

const okId = (id: string) => /^[0-9a-f-]{36}$/i.test(id)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await elGuard(true); if (g.err) return g.err
  if (!okId(id)) return bad('Not found.', 404)
  const b = await req.json().catch(() => null)
  const patch = { subject: clip(b?.subject, 200), preheader: clip(b?.preheader, 200), body: typeof b?.body === 'string' ? b.body.slice(0, 50000) : '', tag: b?.tag ? normTag(String(b.tag)) || null : null, updated_at: new Date().toISOString() }
  const { data, error } = await g.db.from('el_broadcasts').update(patch).eq('id', id).eq('status', 'draft').select(BROADCAST_COLS).maybeSingle()
  if (error) return bad('Could not save.', 500)
  if (!data) return bad('Only drafts can be edited.', 409)
  return NextResponse.json({ broadcast: data })
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await elGuard(true); if (g.err) return g.err
  if (!okId(id)) return bad('Not found.', 404)
  const { error } = await g.db.from('el_broadcasts').delete().eq('id', id).eq('status', 'draft')
  if (error) return bad('Could not delete.', 500)
  return NextResponse.json({ ok: true })
}
