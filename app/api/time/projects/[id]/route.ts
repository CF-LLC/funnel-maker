import { NextResponse } from 'next/server'
import { ttGuard, bad } from '@/lib/time/guard'
import { cleanText, isUuid, parseRate } from '@/lib/time/core'

const COLS = 'id, client_id, name, hourly_rate_cents, billable, archived'
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await ttGuard(true); if (g.err) return g.err
  if (!isUuid(id)) return bad('Not found.', 404)
  const b = await req.json().catch(() => null)
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (b?.name !== undefined) { const n = cleanText(b.name, 120); if (!n) return bad('Give the project a name.'); patch.name = n }
  if (b?.hourly_rate !== undefined) { const r = parseRate(b.hourly_rate); if (r === undefined) return bad('Enter a rate like 85 or 85.50.'); patch.hourly_rate_cents = r }
  if (typeof b?.billable === 'boolean') patch.billable = b.billable
  if (typeof b?.archived === 'boolean') patch.archived = b.archived
  if (b?.client_id !== undefined) { if (!isUuid(b.client_id)) return bad('Pick a client.'); patch.client_id = b.client_id }
  const { data, error } = await g.db.from('tt_projects').update(patch).eq('id', id).select(COLS).maybeSingle()
  if (error) return bad(error.code === '42501' ? 'Client not found.' : 'Could not save the project.')
  if (!data) return bad('Not found.', 404)
  return NextResponse.json({ project: data })
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await ttGuard(true); if (g.err) return g.err
  if (!isUuid(id)) return bad('Not found.', 404)
  const { count: billed } = await g.db.from('tt_entries').select('id', { count: 'exact', head: true }).eq('project_id', id).not('invoice_id', 'is', null)
  if (billed) return bad('Some of this project\u2019s time is on an invoice. Archive it instead.')
  const { error, count } = await g.db.from('tt_projects').delete({ count: 'exact' }).eq('id', id)
  if (error) return bad('Could not delete the project.')
  if (!count) return bad('Not found.', 404)
  return NextResponse.json({ ok: true })
}
