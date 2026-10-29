import { NextResponse } from 'next/server'
import { ptGuard, bad } from '@/lib/portal/guard'
import { BUCKET, PORTAL_COLS, cleanEmail, isUuid } from '@/lib/portal/core'

/** Edit name/email/welcome, or revoke/restore the link. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await ptGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  const up: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof b?.client_name === 'string') { const n = b.client_name.trim().slice(0, 120); if (!n) return bad('Add the client’s name.'); up.client_name = n }
  if (b && 'client_email' in b) { const e = b.client_email ? cleanEmail(b.client_email) : null; if (b.client_email && !e) return bad('That email doesn’t look right.'); up.client_email = e }
  if (b && 'welcome' in b) up.welcome = typeof b.welcome === 'string' ? b.welcome.trim().slice(0, 1000) || null : null
  if (typeof b?.revoked === 'boolean') up.revoked = b.revoked
  const { data, error } = await g.db.from('pt_portals').update(up).eq('id', id).select(PORTAL_COLS).maybeSingle()
  if (error || !data) return bad('Could not save.')
  return NextResponse.json({ portal: data })
}
/** Owner deletes their own portal (and its files from storage). Their invoices/proposals/bookings are untouched. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await ptGuard(true); if (g.err) return g.err
  const { data: files } = await g.db.from('pt_files').select('path').eq('portal_id', id)
  if (files?.length) await g.db.storage.from(BUCKET).remove(files.map((f: any) => f.path))
  const { data } = await g.db.from('pt_portals').delete().eq('id', id).select('id')
  if (!data?.length) return bad('Not found.', 404)
  return NextResponse.json({ ok: true })
}
