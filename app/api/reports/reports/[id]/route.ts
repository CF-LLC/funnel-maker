import { NextResponse } from 'next/server'
import { rpGuard, bad, dbErr } from '@/lib/reports/guard'
import { BUCKET, MAX_NOTES, REPORT_COLS, cleanText, isUuid, parseTemplate, parseValues, slotRanges, totalSlots, type Template } from '@/lib/reports/core'
import { signedImages } from '@/lib/reports/server'
import { DEMO_IMAGES, demoClients, demoImages, demoReports } from '@/lib/reports/demo'

type Ctx = { params: Promise<{ id: string }> }
export const dynamic = 'force-dynamic'
/** One report with short-lived signed links to its screenshots (owner preview). */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await rpGuard(false); if (g.err) return g.err
  if (g.demo) {
    const r = demoClients().flatMap((c) => demoReports(c.id)).find((x) => x.id === id); if (!r) return bad('Not found.', 404)
    return NextResponse.json({ report: r, images: demoImages(r.id).map((i) => ({ ...i, url: DEMO_IMAGES.find((d) => d.slot === i.slot)?.url || null })) })
  }
  const { data: report } = await g.db.from('rp_reports').select(REPORT_COLS).eq('id', id).maybeSingle()
  if (!report) return bad('Not found.', 404)
  return NextResponse.json({ report, images: await signedImages(g.db, id) }, { headers: { 'Cache-Control': 'no-store' } })
}
/** Save title, numbers, notes, shared, or the layout (then screenshots in slots that no longer exist are removed). */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await rpGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  const { data: cur } = await g.db.from('rp_reports').select(REPORT_COLS).eq('id', id).maybeSingle()
  if (!cur) return bad('Not found.', 404)
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  let layout: Template = cur.layout
  if (b && 'layout' in b) { const t = parseTemplate(b.layout); if (!t.ok) return bad(t.error); layout = t.template; row.layout = layout }
  if (b && 'title' in b) { const t = cleanText(b.title, 160); if (!t) return bad('Add a title.'); row.title = t }
  if (b && 'kpi_values' in b) { const v = parseValues(b.kpi_values, layout.kpis); if (!v.ok) return bad(v.error); row.kpi_values = v.values }
  else if (row.layout) row.kpi_values = Object.fromEntries(layout.kpis.map((k) => [k.key, cur.kpi_values?.[k.key] ?? null]))
  if (b && 'notes' in b) row.notes = cleanText(b.notes, MAX_NOTES) || null
  if (b && 'shared' in b) row.shared = b.shared === true
  const { data, error } = await g.db.from('rp_reports').update(row).eq('id', id).select(REPORT_COLS).maybeSingle()
  if (error || !data) return dbErr(error, 'Could not save the report.')
  if (row.layout) {
    const max = totalSlots(layout)
    const { data: gone } = await g.db.from('rp_images').select('id, path').eq('report_id', id).gte('slot', max)
    if (gone?.length) { await g.db.from('rp_images').delete().in('id', gone.map((x: any) => x.id)); await g.db.storage.from(BUCKET).remove(gone.map((x: any) => x.path)) }
  }
  void slotRanges
  return NextResponse.json({ report: data })
}
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await rpGuard(true); if (g.err) return g.err
  const { data: imgs } = await g.db.from('rp_images').select('path').eq('report_id', id)
  const { data, error } = await g.db.from('rp_reports').delete().eq('id', id).select('id')
  if (error) return bad('Could not delete the report.')
  if (!data?.length) return bad('Not found.', 404)
  if (imgs?.length) await g.db.storage.from(BUCKET).remove(imgs.map((i: any) => i.path))
  return NextResponse.json({ ok: true })
}
