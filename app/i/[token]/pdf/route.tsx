import { renderToBuffer } from '@react-pdf/renderer'
import { getPublicInvoice } from '@/lib/invoices/public'
import { InvoicePdf } from '@/components/invoices/invoice-pdf'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const inv = await getPublicInvoice(token)
  if (!inv) return new Response('Not found', { status: 404 })
  const buf = await renderToBuffer(<InvoicePdf d={inv} />)
  const name = `invoice-${inv.number.replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`
  return new Response(new Uint8Array(buf), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' },
  })
}
