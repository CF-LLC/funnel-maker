import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPublicInvoice } from '@/lib/invoices/public'
import { InvoicePreview } from '@/components/invoices/invoice-preview'
import { formatCurrency, safePayLink, totals } from '@/lib/invoices/core'
import { MadeWith } from '@/components/made-with'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Invoice', robots: { index: false, follow: false } }

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const inv = await getPublicInvoice(token)
  if (!inv) notFound()
  const pay = safePayLink(inv.pay_link)
  const total = formatCurrency(totals(inv.lines, inv.tax_rate).total, inv.currency)
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <a href={`/i/${token}/pdf`} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">Download PDF</a>
          {inv.status !== 'paid' && pay && (
            <a href={pay} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:brightness-110">Pay {total}</a>
          )}
        </div>
        <InvoicePreview d={inv} />
        <MadeWith tool="invoices" className="text-slate-400 hover:text-slate-600" />
      </div>
    </main>
  )
}
