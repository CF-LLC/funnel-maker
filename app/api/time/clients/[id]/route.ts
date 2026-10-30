import { NextResponse } from 'next/server'
import { ttGuard, bad } from '@/lib/time/guard'
import { cleanText, isUuid } from '@/lib/time/core'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await ttGuard(true); if (g.err) return g.err
  if (!isUuid(id)) return bad('Not found.', 404)
  const b = await req.json().catch(() => null)
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (b?.name !== undefined) { const n = cleanText(b.name, 120); if (!n) return bad('Give the client a name.'); patch.name = n }
  if (typeof b?.archived === 'boolean') patch.archived = b.archived
  const { data, error } = await g.db.from('tt_clients').update(patch).eq('id', id).select('id, name, email, crm_email, archived').maybeSingle()
  if (error) return bad('Could not save the client.')
  if (!data) return bad('Not found.', 404)
  return NextResponse.json({ client: data })
}
/** Deletes the client, its projects and their entries. Blocked while any of its time is on an invoice. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await ttGuard(true); if (g.err) return g.err
  if (!isUuid(id)) return bad('Not found.', 404)
  const { data: ps } = await g.db.from('tt_projects').select('id').eq('client_id', id)
  const ids = (ps || []).map((p: { id: string }) => p.id)
  if (ids.length) {
    const { count } = await g.db.from('tt_entries').select('id', { count: 'exact', head: true }).in('project_id', ids).not('invoice_id', 'is', null)
    if (count) return bad('Some of this client\u2019s time is on an invoice. Archive the client instead.')
  }
  const { error, count } = await g.db.from('tt_clients').delete({ count: 'exact' }).eq('id', id)
  if (error) return bad('Could not delete the client.')
  if (!count) return bad('Not found.', 404)
  return NextResponse.json({ ok: true })
}
