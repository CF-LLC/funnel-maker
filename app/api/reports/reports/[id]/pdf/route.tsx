import { renderToBuffer } from '@react-pdf/renderer'
import { rpGuard, bad } from '@/lib/reports/guard'
import { REPORT_COLS, isUuid, pdfFileName, reportView } from '@/lib/reports/core'
import { ownerBrand, signedImages } from '@/lib/reports/server'
import { DEMO_OWNER, demoClients, demoReports } from '@/lib/reports/demo'
import { ReportPdf } from '@/components/reports/report-pdf'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
/** Owner PDF of any report (shared or not), same layout the client gets. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await rpGuard(false); if (g.err) return g.err
  let sections, owner: string, logo: string | null = null, client: string, report
  if (g.demo) {
    const c = demoClients().find((x) => demoReports(x.id).some((r) => r.id === id)); if (!c) return bad('Not found.', 404)
    const all = demoReports(c.id); report = all.find((r) => r.id === id)!
    sections = reportView(report, all, []); owner = DEMO_OWNER; client = c.name
  } else {
    const { data: r } = await g.db.from('rp_reports').select(REPORT_COLS).eq('id', id).maybeSingle(); if (!r) return bad('Not found.', 404)
    report = r
    const [{ data: c }, { data: all }, imgs, brand] = await Promise.all([
      g.db.from('rp_clients').select('name').eq('id', r.client_id).maybeSingle(),
      g.db.from('rp_reports').select('month, kpi_values').eq('client_id', r.client_id),
      signedImages(g.db, id), ownerBrand(g.db, g.user.id),
    ])
    sections = reportView(r, all || [], imgs.map((i) => ({ slot: i.slot, url: i.url, caption: i.caption })))
    owner = brand.business_name || 'Your business'; logo = brand.logo_url; client = c?.name || 'client'
  }
  const buf = await renderToBuffer(<ReportPdf sections={sections} owner={owner} logoUrl={logo} title={report.title} />)
  return new Response(new Uint8Array(buf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${pdfFileName(client, report.month.slice(0, 7))}"`, 'Cache-Control': 'private, no-store' } })
}
