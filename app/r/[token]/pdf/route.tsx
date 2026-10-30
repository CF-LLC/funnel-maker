import { renderToBuffer } from '@react-pdf/renderer'
import { clientIp, rateLimit } from '@/lib/server/rate-limit'
import { DEMO_TOKEN, isToken, pdfFileName } from '@/lib/reports/core'
import { clientPage } from '@/lib/reports/page-data'
import { ReportPdf } from '@/components/reports/report-pdf'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
const H = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' }
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (token !== DEMO_TOKEN && !isToken(token)) return new Response('Not found', { status: 404, headers: H })
  if (!rateLimit(`rp-pdf:${clientIp(req)}`, 10, 60_000)) return new Response('Too many requests', { status: 429, headers: H })
  const v = await clientPage(token, new URL(req.url).searchParams.get('m'), null, { count: false, pdf: true })
  if (!v) return new Response('Not found', { status: 404, headers: H })
  const buf = await renderToBuffer(<ReportPdf sections={v.sections} owner={v.owner} logoUrl={v.logoUrl} title={v.title} />)
  return new Response(new Uint8Array(buf), { headers: { ...H, 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${pdfFileName(v.client, v.month)}"` } })
}
