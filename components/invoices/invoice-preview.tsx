// Invoice layout adapted from CF-LLC/InvoiceForge invoice-preview.tsx (no html2canvas; real PDF is server-rendered).
import { formatCurrency, totals } from '@/lib/invoices/core'

export type PreviewData = {
  number: string; issue_date: string; due_date: string; status?: string; currency: string; tax_rate: number | null; notes?: string | null
  client_name: string; client_email?: string | null; client_address?: string | null
  seller_name: string; seller_email?: string | null; seller_address?: string | null
  lines: { description: string; quantity: number; unit_price_cents: number }[]
}

export function InvoicePreview({ d }: { d: PreviewData }) {
  const t = totals(d.lines, d.tax_rate)
  const f = (c: number) => formatCurrency(c, d.currency)
  return (
    <div className="invoice-paper rounded-xl border bg-white p-6 sm:p-8 text-sm text-slate-800 shadow-sm">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <div className="text-2xl font-extrabold tracking-tight">{d.seller_name || 'Your business'}</div>
          {d.seller_email && <div className="text-slate-500">{d.seller_email}</div>}
          {d.seller_address && <div className="whitespace-pre-line text-slate-500">{d.seller_address}</div>}
        </div>
        <div className="text-right">
          <div className="text-xl font-bold uppercase tracking-widest text-violet-700">Invoice</div>
          <div className="font-mono">#{d.number}</div>
          {d.status === 'paid' && <div className="mt-1 inline-block rounded bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">PAID</div>}
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="text-xs font-semibold uppercase text-slate-400">Bill to</div>
          <div className="font-medium">{d.client_name}</div>
          {d.client_email && <div className="text-slate-500">{d.client_email}</div>}
          {d.client_address && <div className="whitespace-pre-line text-slate-500">{d.client_address}</div>}
        </div>
        <div className="sm:text-right">
          <div><span className="text-slate-400">Issued:</span> {d.issue_date}</div>
          <div><span className="text-slate-400">Due:</span> <b>{d.due_date}</b></div>
        </div>
      </div>
      <table className="mt-6 w-full">
        <thead><tr className="border-b text-left text-xs uppercase text-slate-400"><th className="py-2">Description</th><th className="text-right">Qty</th><th className="text-right">Price</th><th className="text-right">Amount</th></tr></thead>
        <tbody>
          {d.lines.map((l, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-2 pr-2">{l.description || '—'}</td>
              <td className="text-right">{l.quantity}</td>
              <td className="text-right">{f(l.unit_price_cents)}</td>
              <td className="text-right">{f(Math.round(l.quantity * l.unit_price_cents))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ml-auto mt-4 w-full max-w-xs space-y-1">
        <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{f(t.subtotal)}</span></div>
        {d.tax_rate ? <div className="flex justify-between"><span className="text-slate-500">Tax ({d.tax_rate}%)</span><span>{f(t.tax)}</span></div> : null}
        <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Total</span><span>{f(t.total)}</span></div>
      </div>
      {d.notes && <div className="mt-6 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-slate-600">{d.notes}</div>}
    </div>
  )
}
