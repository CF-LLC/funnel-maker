'use client'

import { useMemo, useState } from 'react'
import { InvoicePreview } from '@/components/invoices/invoice-preview'
import { FREE_INVOICE_CURRENCIES, blankFreeInvoice, pdfFileName, toPreviewData, type FreeInvoiceForm } from '@/lib/free-tools/invoice'

// Browser-only: state lives in React memory only. No browser storage, no network calls.
const inp = 'w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-400 focus:outline-none'
const lbl = 'mb-1 block text-xs font-medium text-zinc-400'

export function FreeInvoiceGenerator() {
  const [f, setF] = useState<FreeInvoiceForm>(() => blankFreeInvoice())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const d = useMemo(() => toPreviewData(f), [f])
  const set = <K extends keyof FreeInvoiceForm>(k: K, v: FreeInvoiceForm[K]) => setF((p) => ({ ...p, [k]: v }))
  const setLine = (i: number, k: 'description' | 'quantity' | 'price', v: string) =>
    setF((p) => ({ ...p, lines: p.lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)) }))

  async function download() {
    setBusy(true); setErr(null)
    try {
      const [{ pdf }, { InvoicePdf }] = await Promise.all([import('@react-pdf/renderer'), import('@/components/invoices/invoice-pdf')])
      const blob = await pdf(<InvoicePdf d={d} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = pdfFileName(d.number); document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch {
      setErr('Could not build the PDF. Please try again.')
    } finally { setBusy(false) }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form className="min-w-0 space-y-6" onSubmit={(e) => { e.preventDefault(); download() }}>
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-bold text-white">From</legend>
          <div className="sm:col-span-2"><label className={lbl} htmlFor="fromName">Your name or business</label><input id="fromName" className={inp} value={f.fromName} onChange={(e) => set('fromName', e.target.value)} placeholder="Acme Studio" /></div>
          <div><label className={lbl} htmlFor="fromEmail">Email</label><input id="fromEmail" type="email" className={inp} value={f.fromEmail} onChange={(e) => set('fromEmail', e.target.value)} placeholder="you@example.com" /></div>
          <div><label className={lbl} htmlFor="fromAddress">Address</label><textarea id="fromAddress" rows={2} className={inp} value={f.fromAddress} onChange={(e) => set('fromAddress', e.target.value)} /></div>
        </fieldset>
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-bold text-white">Bill to</legend>
          <div className="sm:col-span-2"><label className={lbl} htmlFor="toName">Client name</label><input id="toName" className={inp} value={f.toName} onChange={(e) => set('toName', e.target.value)} placeholder="Client Co." /></div>
          <div><label className={lbl} htmlFor="toEmail">Client email</label><input id="toEmail" type="email" className={inp} value={f.toEmail} onChange={(e) => set('toEmail', e.target.value)} /></div>
          <div><label className={lbl} htmlFor="toAddress">Client address</label><textarea id="toAddress" rows={2} className={inp} value={f.toAddress} onChange={(e) => set('toAddress', e.target.value)} /></div>
        </fieldset>
        <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <legend className="mb-2 text-sm font-bold text-white">Details</legend>
          <div className="col-span-2 sm:col-span-1"><label className={lbl} htmlFor="number">Invoice #</label><input id="number" className={inp} value={f.number} onChange={(e) => set('number', e.target.value)} /></div>
          <div className="col-span-2 sm:col-span-1"><label className={lbl} htmlFor="currency">Currency</label><select id="currency" className={inp} value={f.currency} onChange={(e) => set('currency', e.target.value)}>{FREE_INVOICE_CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className={lbl} htmlFor="issueDate">Issue date</label><input id="issueDate" type="date" className={inp} value={f.issueDate} onChange={(e) => set('issueDate', e.target.value)} /></div>
          <div><label className={lbl} htmlFor="dueDate">Due date</label><input id="dueDate" type="date" className={inp} value={f.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></div>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-bold text-white">Line items</legend>
          {f.lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_4rem_6rem_2rem] items-end gap-2">
              <div><label className={lbl} htmlFor={`d${i}`}>Description</label><input id={`d${i}`} className={inp} value={l.description} onChange={(e) => setLine(i, 'description', e.target.value)} placeholder="Design work" /></div>
              <div><label className={lbl} htmlFor={`q${i}`}>Qty</label><input id={`q${i}`} inputMode="decimal" className={inp} value={l.quantity} onChange={(e) => setLine(i, 'quantity', e.target.value)} /></div>
              <div><label className={lbl} htmlFor={`p${i}`}>Price</label><input id={`p${i}`} inputMode="decimal" className={inp} value={l.price} onChange={(e) => setLine(i, 'price', e.target.value)} placeholder="0.00" /></div>
              <button type="button" aria-label={`Remove line ${i + 1}`} disabled={f.lines.length === 1} onClick={() => setF((p) => ({ ...p, lines: p.lines.filter((_, j) => j !== i) }))} className="h-9 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white disabled:opacity-30">×</button>
            </div>
          ))}
          <button type="button" onClick={() => setF((p) => ({ ...p, lines: [...p.lines, { description: '', quantity: '1', price: '' }] }))} className="text-sm font-semibold text-violet-300 hover:text-white">+ Add line</button>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          <div><label className={lbl} htmlFor="tax">Tax %</label><input id="tax" inputMode="decimal" className={inp} value={f.taxRate} onChange={(e) => set('taxRate', e.target.value)} placeholder="0" /></div>
          <div><label className={lbl} htmlFor="notes">Notes</label><textarea id="notes" rows={2} className={inp} value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Thanks for your business! Payment by bank transfer." /></div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className="rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 px-6 py-3 font-bold text-white shadow-lg hover:brightness-110 disabled:opacity-60">{busy ? 'Building PDF…' : 'Download PDF'}</button>
          <button type="button" onClick={() => setF(blankFreeInvoice())} className="text-sm text-zinc-400 hover:text-white">Clear</button>
          {err ? <span role="alert" className="text-sm text-red-400">{err}</span> : null}
        </div>
      </form>
      <div className="min-w-0 lg:sticky lg:top-20 lg:self-start">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Live preview</p>
        <div className="overflow-x-auto"><InvoicePreview d={d} /></div>
      </div>
    </div>
  )
}
