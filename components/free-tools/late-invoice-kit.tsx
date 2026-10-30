'use client'

import { useMemo, useState } from 'react'
import { daysLateFrom, lateFee, money, prettyDate, reminders, type FeeMode, type Tone } from '@/lib/free-tools/late-invoice'
import { madeWithHref } from '@/lib/acquisition/core'

// Browser-only: state lives in React memory only. No browser storage, no network calls, nothing is sent.
const inp = 'w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-rose-400 focus:outline-none'
const lbl = 'mb-1 block text-xs font-medium text-zinc-400'
const isoDaysAgo = (n: number) => { const d = new Date(Date.now() - n * 86_400_000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

function CopyBtn({ text, label, id }: { text: string; label: string; id: string }) {
  const [done, setDone] = useState(false)
  return (
    <button type="button" data-testid={id} onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500) } catch { /* clipboard blocked */ } }}
      className="min-h-[36px] rounded-lg bg-white/10 px-3 text-xs font-semibold text-white ring-1 ring-white/15 hover:bg-white/20">{done ? 'Copied ✓' : label}</button>
  )
}

export function LateInvoiceKit() {
  const [num, setNum] = useState('INV-1042')
  const [amount, setAmount] = useState('1200')
  const [due, setDue] = useState(() => isoDaysAgo(21))
  const [override, setOverride] = useState('')
  const [client, setClient] = useState('')
  const [you, setYou] = useState('')
  const [mode, setMode] = useState<FeeMode>('monthly')
  const [rate, setRate] = useState('1.5')
  const [tone, setTone] = useState<Tone>('neutral')
  const amt = Number(String(amount).replace(/[, $]/g, '')) || 0
  const auto = daysLateFrom(due)
  const days = override.trim() !== '' ? Math.max(0, Math.floor(Number(override) || 0)) : auto
  const ratePct = Number(String(rate).replace(/[, %]/g, '')) || 0
  const { fee, total } = lateFee(amt, mode, ratePct, days)
  const input = { number: num, amount: amt, dueDate: due, daysLate: days, client, you, mode, ratePct }
  const msgs = useMemo(() => reminders(input, tone), [num, amt, due, days, client, you, mode, ratePct, tone]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-10">
      <style>{`@media print { body * { visibility: hidden !important; } #late-notice, #late-notice * { visibility: visible !important; } #late-notice { position: absolute; inset: 0 auto auto 0; width: 100%; margin: 0; border: 0 !important; box-shadow: none !important; } @page { margin: 18mm; } }`}</style>
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <form className="min-w-0 space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl} htmlFor="lk-num">Invoice number</label><input id="lk-num" className={inp} value={num} onChange={(e) => setNum(e.target.value.slice(0, 40))} /></div>
            <div><label className={lbl} htmlFor="lk-amount">Amount due</label><div className="relative"><span className="pointer-events-none absolute left-3 top-2 text-sm text-zinc-500">$</span><input id="lk-amount" inputMode="decimal" className={`${inp} pl-7`} value={amount} onChange={(e) => setAmount(e.target.value)} /></div></div>
            <div><label className={lbl} htmlFor="lk-due">Due date</label><input id="lk-due" type="date" className={inp} value={due} onChange={(e) => setDue(e.target.value)} /></div>
            <div><label className={lbl} htmlFor="lk-days">Days late</label><input id="lk-days" inputMode="numeric" className={inp} value={override} placeholder={String(auto)} onChange={(e) => setOverride(e.target.value.replace(/[^\d]/g, '').slice(0, 4))} /></div>
            <div><label className={lbl} htmlFor="lk-client">Client name</label><input id="lk-client" className={inp} value={client} placeholder="Acme Co." onChange={(e) => setClient(e.target.value.slice(0, 80))} /></div>
            <div><label className={lbl} htmlFor="lk-you">Your name</label><input id="lk-you" className={inp} value={you} placeholder="Sam Rivera" onChange={(e) => setYou(e.target.value.slice(0, 80))} /></div>
          </div>
          <p className="text-xs text-zinc-500">Days late is worked out from the due date; type a number to override it.</p>
        </form>

        <section aria-live="polite" className="min-w-0 rounded-2xl border border-white/10 bg-gradient-to-br from-rose-600/25 via-zinc-900 to-orange-600/25 p-6 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-rose-200">Late fee calculator</p>
            <div role="group" aria-label="Fee type" className="flex rounded-lg border border-white/10 p-0.5 text-xs">
              {([['flat', 'Flat %'], ['monthly', '% per month']] as const).map(([m, l]) => (
                <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`min-h-[32px] rounded-md px-3 ${mode === m ? 'bg-rose-500/25 text-rose-100' : 'text-zinc-400'}`}>{l}</button>
              ))}
            </div>
          </div>
          <div className="mt-4 max-w-[12rem]"><label className={lbl} htmlFor="lk-rate">{mode === 'flat' ? 'One-time fee (% of invoice)' : 'Interest rate (% per month)'}</label><div className="relative"><input id="lk-rate" inputMode="decimal" className={`${inp} pr-8`} value={rate} onChange={(e) => setRate(e.target.value)} /><span className="pointer-events-none absolute right-3 top-2 text-xs leading-5 text-zinc-500">%</span></div></div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-black/30 p-3"><p className="text-xs text-zinc-400">Days late</p><p className="text-xl font-bold" data-testid="lk-days-out">{days}</p></div>
            <div className="rounded-xl bg-black/30 p-3"><p className="text-xs text-zinc-400">Late fee</p><p className="text-xl font-bold text-rose-200" data-testid="lk-fee">{money(fee)}</p></div>
            <div className="rounded-xl bg-black/30 p-3"><p className="text-xs text-zinc-400">New total</p><p className="text-xl font-bold" data-testid="lk-total">{money(total)}</p></div>
          </div>
          <p className="mt-3 text-xs text-zinc-400">{mode === 'flat' ? 'A one-time charge on the invoice amount.' : 'Simple interest, pro-rated by day (rate × days ÷ 30).'}</p>
          <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100" data-testid="lk-legal">Only charge a late fee your contract or invoice terms allow, and check local law: many places cap late fees and interest. This is not legal advice.</p>
        </section>
      </div>

      <section className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">3-step reminder sequence</h2>
          <div role="group" aria-label="Tone" className="flex rounded-lg border border-white/10 p-0.5 text-xs">
            {(['warm', 'neutral', 'direct'] as const).map((t) => (
              <button key={t} type="button" aria-pressed={tone === t} onClick={() => setTone(t)} className={`min-h-[32px] rounded-md px-3 capitalize ${tone === t ? 'bg-rose-500/25 text-rose-100' : 'text-zinc-400'}`}>{t}</button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-sm text-zinc-400">Copy and send them yourself, e.g. on day 1, day 7 and day 14 after the due date. Nothing is sent from here.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {msgs.map((m) => (
            <article key={m.step} className="flex min-w-0 flex-col rounded-2xl border border-white/10 bg-zinc-900 p-4" data-testid={`lk-msg-${m.step}`}>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-300">Step {m.step} · {m.label}</p>
              <p className="mt-2 text-sm font-semibold text-white">Subject: {m.subject}</p>
              <pre className="mt-2 flex-1 whitespace-pre-wrap break-words font-sans text-sm text-zinc-300">{m.body}</pre>
              <div className="mt-3 flex gap-2"><CopyBtn id={`lk-copy-subject-${m.step}`} label="Copy subject" text={m.subject} /><CopyBtn id={`lk-copy-${m.step}`} label="Copy message" text={m.body} /></div>
            </article>
          ))}
        </div>
      </section>

      <section className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Printable late notice</h2>
          <button type="button" data-testid="lk-print" onClick={() => window.print()} className="min-h-[40px] rounded-full bg-rose-600 px-5 text-sm font-semibold text-white hover:bg-rose-500">Print / save as PDF</button>
        </div>
        <div id="late-notice" className="mx-auto mt-4 max-w-2xl rounded-2xl bg-white p-8 text-zinc-900 shadow-2xl" data-testid="lk-notice">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-rose-600">Payment overdue</p>
          <h3 className="mt-2 text-2xl font-extrabold">Late payment notice</h3>
          <p className="mt-1 text-sm text-zinc-500">Date: {prettyDate(isoDaysAgo(0))}</p>
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs uppercase text-zinc-500">From</p><p className="font-semibold">{you.trim() || '[your name]'}</p></div>
            <div><p className="text-xs uppercase text-zinc-500">To</p><p className="font-semibold">{client.trim() || '[client name]'}</p></div>
          </div>
          <table className="mt-6 w-full text-sm">
            <tbody className="[&_td]:border-b [&_td]:border-zinc-200 [&_td]:py-2">
              <tr><td>Invoice</td><td className="text-right font-semibold">{num.trim() || '[invoice #]'}</td></tr>
              <tr><td>Due date</td><td className="text-right">{prettyDate(due)}</td></tr>
              <tr><td>Days overdue</td><td className="text-right">{days}</td></tr>
              <tr><td>Amount due</td><td className="text-right">{money(amt)}</td></tr>
              {fee > 0 ? <tr><td>Late fee{mode === 'flat' ? ` (${ratePct}%)` : ` (${ratePct}% per month)`}</td><td className="text-right">{money(fee)}</td></tr> : null}
              <tr><td className="font-bold">Total now due</td><td className="text-right text-lg font-extrabold">{money(total)}</td></tr>
            </tbody>
          </table>
          <p className="mt-6 text-sm">Our records show the invoice above has not been paid. Please pay the total now due within 7 days of this notice. If you have already paid, thank you, and please disregard this notice.</p>
          <p className="mt-6 text-sm">{you.trim() || '[your name]'}</p>
          <p className="mt-8 text-center text-[10px] text-zinc-400"><a href={madeWithHref('latekit')} target="_blank" rel="noopener">Made with SaaS Nation</a></p>
        </div>
      </section>
    </div>
  )
}
