import { NextResponse } from 'next/server'
import { rpGuard, bad, dbErr } from '@/lib/reports/guard'
import { BUCKET, CLIENT_COLS, IMAGE_COLS, REPORT_COLS, cleanEmail, cleanText, isUuid, newToken, parseTemplate } from '@/lib/reports/core'
import { demoClients, demoImages, demoReports } from '@/lib/reports/demo'

type Ctx = { params: Promise<{ id: string }> }
export const dynamic = 'force-dynamic'
/** One client with all its reports and image metadata (no storage paths). */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await rpGuard(false); if (g.err) return g.err
  if (g.demo) {
    const client = demoClients().find((c) => c.id === id); if (!client) return bad('Not found.', 404)
    const reports = demoReports(id)
    return NextResponse.json({ demo: true, client, reports, images: reports.flatMap((r) => demoImages(r.id)) })
  }
  const { data: client } = await g.db.from('rp_clients').select(CLIENT_COLS).eq('id', id).maybeSingle()
  if (!client) return bad('Not found.', 404)
  const { data: reports } = await g.db.from('rp_reports').select(REPORT_COLS).eq('client_id', id).order('month')
  const ids = (reports || []).map((r: any) => r.id)
  const { data: images } = ids.length ? await g.db.from('rp_images').select(IMAGE_COLS).in('report_id', ids) : { data: [] }
  return NextResponse.json({ demo: false, client, reports: reports || [], images: images || [] }, { headers: { 'Cache-Control': 'no-store' } })
}
/** Rename, change email, save the template, revoke/restore the link, or make a new link (old one stops working). */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await rpGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (b && 'name' in b) { const n = cleanText(b.name, 120); if (!n) return bad('Add the client’s name.'); row.name = n }
  if (b && 'email' in b) { if (b.email && !cleanEmail(b.email)) return bad('That email doesn’t look right.'); row.email = cleanEmail(b.email) }
  if (b && 'template' in b) { const t = parseTemplate(b.template); if (!t.ok) return bad(t.error); row.template = t.template }
  if (b && 'revoked' in b) row.revoked = b.revoked === true
  if (b?.regenerate === true) { row.token = newToken(); row.revoked = false }
  const { data, error } = await g.db.from('rp_clients').update(row).eq('id', id).select(CLIENT_COLS).maybeSingle()
  if (error) return dbErr(error, 'Could not save.')
  if (!data) return bad('Not found.', 404)
  return NextResponse.json({ client: data })
}
/** Delete the client, every report and every screenshot file. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await rpGuard(true); if (g.err) return g.err
  const { data: rs } = await g.db.from('rp_reports').select('id').eq('client_id', id)
  const ids = (rs || []).map((r: any) => r.id)
  const { data: imgs } = ids.length ? await g.db.from('rp_images').select('path').in('report_id', ids) : { data: [] }
  const { data, error } = await g.db.from('rp_clients').delete().eq('id', id).select('id')
  if (error) return bad('Could not delete.')
  if (!data?.length) return bad('Not found.', 404)
  const paths = (imgs || []).map((i: any) => i.path)
  if (paths.length) await g.db.storage.from(BUCKET).remove(paths)
  return NextResponse.json({ ok: true })
}
