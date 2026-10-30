'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { api, btnGhost, btnPrimary, card, input } from '@/components/emaillist/ui'
import { formatCurrency } from '@/lib/invoices/core'
import {
  MAX_FILE_BYTES, TIER_LABEL, cleanMapping, extractCredits, guessMapping, mappingReady, matchCredits, parseCsv, safePayer,
  type Credit, type Mapping, type OpenInvoice, type Suggestion, type Tier,
} from '@/lib/paid/core'
import { demoCsv } from '@/lib/paid/demo'

type Match = { id: string; invoice_id: string; amount_cents: number; paid_on: string; confidence: string; payer: string | null; note: string | null; number?: string; client_name?: string; total?: number; currency?: string }
const TIER_STYLE: Record<Tier, string> = {
  exact: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  likely: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30',
  possible: 'bg-amber-500/15 text-amber-200 border-amber-400/30',
  unmatched: 'bg-white/5 text-zinc-400 border-white/10',
}
const fmtDay = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

export function PaidApp() {
  const [state, setState] = useState<{ demo: boolean; invoices: OpenInvoice[]; matches: Match[]; mapping: Mapping | null; tol: number } | null>(null)
  const [err, setErr] = useState('')
  const [toast, setToast] = useState('')
  const [rows, setRows] = useState<string[][] | null>(null)
  const [fileName, setFileName] = useState('')
  const [map, setMap] = useState<Mapping | null>(null)
  const [tol, setTol] = useState(0)
  const [paste, setPaste] = useState('')
  const [done, setDone] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const say = (m: string) => { setToast(m); setTimeout(() => setToast((t) => (t === m ? '' : t)), 3500) }

  const load = useCallback(async () => {
    const r = await api('/api/paid', 'GET')
    if (!r.ok) { setErr(r.data.error || 'Could not load.'); return }
    setState({ demo: r.data.demo, invoices: r.data.invoices, matches: r.data.matches, mapping: r.data.mapping, tol: r.data.tolerance_cents })
    setTol(r.data.demo ? 500 : r.data.tolerance_cents || 0)
  }, [])
  useEffect(() => { load() }, [load])

  const loadText = (text: string, name: string) => {
    const parsed = parseCsv(text)
    if (parsed.length < 2) { setErr('That file has no rows we can read. Export a CSV from your bank and try again.'); return }
    setErr(''); setRows(parsed); setFileName(name); setDone(new Set())
    const saved = state?.mapping ? cleanMapping(state.mapping, parsed[0]) : null
    setMap(saved && mappingReady(saved) ? saved : guessMapping(parsed[0]))
  }
  const onFile = async (f: File | undefined) => {
    if (!f) return
    if (f.size > MAX_FILE_BYTES) { setErr('That file is over 5 MB. Export a shorter date range.'); return }
    loadText(await f.text(), f.name)
    if (fileRef.current) fileRef.current.value = ''
  }
  const clear = () => { setRows(null); setFileName(''); setMap(null); setPaste(''); setDone(new Set()) }

  const extracted = useMemo(() => (rows && map && mappingReady(map) ? extractCredits(rows, map) : null), [rows, map])
  const open = useMemo(() => (state?.invoices || []), [state])
  const suggestions = useMemo(() => (extracted ? matchCredits(extracted.credits.filter((c) => !done.has(c.key)), open, tol) : []), [extracted, open, tol, done])

  const saveMapping = async () => {
    if (!map || !state || state.demo) return
    const r = await api('/api/paid/mapping', 'PUT', { mapping: map, tolerance_cents: tol })
    say(r.ok ? 'Column choices saved for next time.' : r.data.error || 'Could not save.')
  }

  const confirm = async (s: Suggestion, invoice: OpenInvoice, partial: boolean) => {
    if (!state) return
    const conf = s.invoice?.id === invoice.id && s.tier !== 'unmatched' ? s.tier : 'manual'
    const note = partial ? 'Partial payment' : null
    setBusy(s.credit.key)
    if (state.demo) {
      const m: Match = { id: `demo-${Date.now()}`, invoice_id: invoice.id, amount_cents: s.credit.amountCents, paid_on: s.credit.date, confidence: conf, payer: safePayer(s.credit.description), note, number: invoice.number, client_name: invoice.client_name, total: invoice.total, currency: invoice.currency }
      setState({ ...state, invoices: state.invoices.filter((i) => i.id !== invoice.id), matches: [m, ...state.matches] })
      setDone(new Set(done).add(s.credit.key)); setBusy(''); say(`Demo: ${invoice.number} marked paid (not saved).`); return
    }
    const r = await api('/api/paid/confirm', 'POST', { invoiceId: invoice.id, amountCents: s.credit.amountCents, paidOn: s.credit.date, confidence: conf, payer: safePayer(s.credit.description), note })
    setBusy('')
    if (!r.ok) { say(r.data.error || 'Could not mark it paid.'); load(); return }
    setDone(new Set(done).add(s.credit.key))
    say(`${invoice.number} marked paid.`)
    load()
  }
  const undo = async (m: Match) => {
    if (!state) return
    setBusy(m.id)
    if (state.demo) {
      const inv = { id: m.invoice_id, number: m.number || '', client_name: m.client_name || '', total: m.total || m.amount_cents, currency: m.currency || 'USD', due_date: m.paid_on, issue_date: m.paid_on }
      setState({ ...state, invoices: [...state.invoices, inv], matches: state.matches.filter((x) => x.id !== m.id) })
      setDone(new Set()); setBusy(''); say('Demo: undone.'); return
    }
    const r = await api('/api/paid/undo', 'POST', { matchId: m.id })
    setBusy('')
    say(r.ok ? `${m.number || 'Invoice'} is unpaid again.` : r.data.error || 'Could not undo.')
    if (r.ok) setDone(new Set())
    load()
  }

  if (err && !state) return <div className={`${card} text-red-300`}>{err}</div>
  if (!state) return <div className="py-16 text-center text-zinc-500">Loading…</div>
  const headers = rows?.[0] || []
  const counts = suggestions.reduce((a, s) => ({ ...a, [s.tier]: (a[s.tier] || 0) + 1 }), {} as Record<string, number>)

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Paid?</h1>
          <p className="mt-1 text-sm text-zinc-400">Drop in a bank CSV and match money in to your open invoices.</p>
        </div>
        <div className="ml-auto text-right text-sm text-zinc-400"><span className="text-xl font-bold text-white">{open.length}</span> open invoice{open.length === 1 ? '' : 's'}</div>
      </div>

      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
        Your bank file stays in this browser tab. We never upload or keep it. When you confirm a match we only save the invoice, amount, date, match strength and a short payer name.
      </div>

      {!rows ? (
        <div className={card}>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 px-4 py-10 text-center hover:border-cyan-400/50"
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]) }}>
            <span className="text-base font-semibold">Choose a bank CSV</span>
            <span className="text-xs text-zinc-500">or drop it here · up to 5 MB · read on your device</span>
            <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} data-testid="csv-file" />
          </label>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-zinc-300">Or paste CSV text</summary>
            <textarea className={`${input} mt-2 h-32 font-mono text-xs`} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Date,Description,Amount" aria-label="Paste CSV" />
            <button className={`${btnGhost} mt-2`} disabled={!paste.trim()} onClick={() => loadText(paste, 'Pasted text')}>Use pasted text</button>
          </details>
          {state.demo && <button className={`${btnPrimary} mt-4 w-full sm:w-auto`} onClick={() => loadText(demoCsv(), 'riverside-sample.csv')}>Try the sample bank file</button>}
          {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
        </div>
      ) : (
        <>
          <div className={card}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="font-bold">Columns</h2>
              <span className="truncate text-xs text-zinc-500">{fileName} · {rows.length - 1} rows</span>
              <button className={`${btnGhost} ml-auto !px-3 !py-1 text-xs`} onClick={clear}>Clear file</button>
            </div>
            {map && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Pick label="Date" value={map.date} headers={headers} onChange={(v) => setMap({ ...map, date: v })} />
                <Pick label="Description" value={map.description} headers={headers} onChange={(v) => setMap({ ...map, description: v })} />
                <label className="text-xs text-zinc-400">Date format
                  <select className={`${input} mt-1`} value={map.dateOrder || 'mdy'} onChange={(e) => setMap({ ...map, dateOrder: e.target.value as 'mdy' | 'dmy' })}>
                    <option value="mdy">Month/Day/Year</option><option value="dmy">Day/Month/Year</option>
                  </select>
                </label>
                <Pick label="Amount (one column, + is money in)" value={map.amount || ''} headers={headers} optional onChange={(v) => setMap({ ...map, amount: v || undefined, credit: v ? undefined : map.credit })} />
                <Pick label="Credit / money in" value={map.credit || ''} headers={headers} optional onChange={(v) => setMap({ ...map, credit: v || undefined, amount: v ? undefined : map.amount })} />
                <Pick label="Debit / money out (ignored)" value={map.debit || ''} headers={headers} optional onChange={(v) => setMap({ ...map, debit: v || undefined })} />
                <label className="text-xs text-zinc-400">Amount can be off by up to
                  <select className={`${input} mt-1`} value={tol} onChange={(e) => setTol(Number(e.target.value))}>
                    {[0, 100, 500, 1000, 2500, 5000].map((c) => <option key={c} value={c}>{c ? formatCurrency(c) : 'Exact only'}</option>)}
                  </select>
                </label>
              </div>
            )}
            {map && !mappingReady(map) && <p className="mt-3 text-sm text-amber-200">Pick a date, a description and either an amount or a credit column.</p>}
            {extracted && <p className="mt-3 text-xs text-zinc-500">{extracted.credits.length} credits found · {extracted.skipped.debits} debits ignored{extracted.skipped.unreadable ? ` · ${extracted.skipped.unreadable} rows skipped (no date or amount)` : ''}</p>}
            {!state.demo && map && mappingReady(map) && <button className={`${btnGhost} mt-3 !py-1.5 text-xs`} onClick={saveMapping}>Remember these columns</button>}
          </div>

          {extracted && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs">
                {(['exact', 'likely', 'possible', 'unmatched'] as Tier[]).map((t) => <span key={t} className={`rounded-full border px-2.5 py-1 ${TIER_STYLE[t]}`}>{TIER_LABEL[t]} {counts[t] || 0}</span>)}
              </div>
              {suggestions.length === 0 && <div className={`${card} text-center text-sm text-zinc-400`}>All done. Nothing left to match in this file.</div>}
              {suggestions.map((s) => <Row key={s.credit.key} s={s} open={open} busy={busy === s.credit.key} onConfirm={confirm} />)}
            </div>
          )}
        </>
      )}

      <div className={card}>
        <h2 className="mb-3 font-bold">Marked paid with Paid?</h2>
        {state.matches.length === 0 ? <p className="text-sm text-zinc-500">Nothing yet. Confirmed matches show here and can be undone.</p> : (
          <ul className="divide-y divide-white/5">
            {state.matches.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
                <span className="font-mono">{m.number}</span>
                <span className="text-zinc-400">{m.client_name}</span>
                <span className="font-semibold">{formatCurrency(m.amount_cents)}</span>
                <span className="text-xs text-zinc-500">{fmtDay(m.paid_on)} · {m.confidence}{m.note ? ` · ${m.note}` : ''}</span>
                <button className={`${btnGhost} ml-auto !px-3 !py-1 text-xs`} disabled={busy === m.id} onClick={() => undo(m)}>Undo</button>
              </li>
            ))}
          </ul>
        )}
        {!state.demo && <p className="mt-3 text-xs text-zinc-500">Marked invoices show as Paid in <Link className="underline" href="/invoices">Invoices</Link>.</p>}
      </div>

      {toast && <div role="status" className="fixed inset-x-0 bottom-4 z-50 mx-auto w-fit max-w-[92vw] rounded-full border border-white/10 bg-[#141418] px-4 py-2 text-sm shadow-xl">{toast}</div>}
    </div>
  )
}

function Pick({ label, value, headers, onChange, optional }: { label: string; value: string; headers: string[]; onChange: (v: string) => void; optional?: boolean }) {
  return (
    <label className="text-xs text-zinc-400">{label}
      <select className={`${input} mt-1`} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{optional ? 'None' : 'Pick a column'}</option>
        {headers.map((h, i) => h ? <option key={`${h}-${i}`} value={h}>{h}</option> : null)}
      </select>
    </label>
  )
}

function Row({ s, open, busy, onConfirm }: { s: Suggestion; open: OpenInvoice[]; busy: boolean; onConfirm: (s: Suggestion, inv: OpenInvoice, partial: boolean) => void }) {
  const [pick, setPick] = useState(s.invoice?.id || '')
  const [partial, setPartial] = useState(false)
  useEffect(() => { setPick(s.invoice?.id || '') }, [s.invoice?.id])
  const inv = open.find((i) => i.id === pick) || null
  const c: Credit = s.credit
  const diff = inv ? c.amountCents - inv.total : 0
  return (
    <div className={`${card} !p-4`} data-testid="match-row">
      <div className="flex flex-wrap items-start gap-2">
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TIER_STYLE[s.tier]}`}>{TIER_LABEL[s.tier]}</span>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-bold">{formatCurrency(c.amountCents)} <span className="text-sm font-normal text-zinc-400">in on {fmtDay(c.date)}</span></div>
          <div className="truncate text-xs text-zinc-500" title={c.description}>{c.description || 'No description'}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <select className={`${input} sm:flex-1`} value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Invoice">
          <option value="">{s.tier === 'unmatched' ? 'Pick an open invoice…' : 'Not this one'}</option>
          {[...(s.invoice ? [s.invoice] : []), ...s.alternatives, ...open.filter((o) => o.id !== s.invoice?.id && !s.alternatives.some((a) => a.id === o.id))].map((o) => (
            <option key={o.id} value={o.id}>{o.number} · {o.client_name} · {formatCurrency(o.total, o.currency)}</option>
          ))}
        </select>
        <button className={`${btnPrimary} w-full sm:w-auto`} disabled={!inv || busy} onClick={() => inv && onConfirm(s, inv, partial)}>{busy ? 'Saving…' : 'Mark paid'}</button>
      </div>
      {inv && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
          {pick === s.invoice?.id && s.reasons.length > 0 && <span>{s.reasons.join(' · ')}</span>}
          {diff !== 0 && <span className="text-amber-200">{diff < 0 ? `${formatCurrency(-diff)} short of` : `${formatCurrency(diff)} over`} {formatCurrency(inv.total, inv.currency)}</span>}
          <label className="ml-auto inline-flex items-center gap-1.5"><input type="checkbox" checked={partial} onChange={(e) => setPartial(e.target.checked)} /> Note as partial</label>
        </div>
      )}
    </div>
  )
}
