import { NextResponse } from 'next/server'
import { clGuard, bad } from '@/lib/changelog/guard'
import { REQ_COLS, cleanRequest, isUuid } from '@/lib/changelog/core'

/** Edit a request. Changing it after the client answered sends it back to "waiting". Invoiced requests are locked. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await clGuard(true); if (g.err) return g.err
  const c = cleanRequest(await req.json().catch(() => null)); if (!c.ok) return bad(c.error)
  const { data, error } = await g.db.from('cl_requests').update({ ...c.r, updated_at: new Date().toISOString() }).eq('id', id).is('invoice_id', null).select(REQ_COLS).maybeSingle()
  if (error || !data) return bad('Could not save. Invoiced requests can’t be edited.')
  return NextResponse.json({ request: data })
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await clGuard(true); if (g.err) return g.err
  const { data } = await g.db.from('cl_requests').delete().eq('id', id).is('invoice_id', null).select('id')
  if (!data?.length) return bad('Not found, or already invoiced.', 404)
  return NextResponse.json({ ok: true })
}
