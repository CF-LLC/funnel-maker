'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Download, FileText, Pencil, Plus, Receipt, Trash2, Paperclip } from 'lucide-react'
import { api, btnGhost, btnPrimary, card, input, Modal } from '@/components/emaillist/ui'
import {
  MAX_RECEIPT_BYTES, RECEIPT_TYPES, addMonths, billTo, fmtMoney, localDate, monthEnd, monthOf, monthSeries, monthTotals, parseAmount, unbilledGroups,
  type BillTo, type Category, type Crm, type Expense, type TtProject,
} from '@/lib/expenses/core'

type Data = { demo: boolean; categories: Category[]; expenses: Expense[]; projects: TtProject[]; crm: Crm[] }
type Tab = 'expenses' | 'totals' | 'categories'
type Group = { to: BillTo | null; items: Expense[]; cents: number }
const DEMO_NOTE = 'Demo: shown here only, nothing is saved.'
let seq = 0
const demoId = () => `00000000-0000-4000-8000-${String(Date.now() % 1e9).padStart(9, '0')}${String(++seq % 1000).padStart(3, '0')}`
const niceMonth = (ym: string) => new Date(ym + '-15T12:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
const niceDate = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

export function ExpensesApp() {
  const [d, setD] = useState<Data | null>(null)
  const [err, setErr] = useState('')
  const [toast, setToast] = useState('')
  const [tab, setTab] = useState<Tab>('expenses')
  const [ym, setYm] = useState(monthOf(localDate()))
  const [editing, setEditing] = useState<Expense | 'new' | null>(null)
  const [invoicing, setInvoicing] = useState<Group | null>(null)
  const load = useCallback(async () => { const r = await api('/api/expenses', 'GET'); if (r.ok) setD(r.data); else setErr(r.data.error || 'Could not load.') }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3800); return () => clearTimeout(t) }, [toast])
  const set = (f: (x: Data) => Data) => setD((x) => (x ? f(x) : x))
  const upsert = (e: Expense) => set((x) => ({ ...x, expenses: x.expenses.some((y) => y.id === e.id) ? x.expenses.map((y) => (y.id === e.id ? e : y)) : [e, ...x.expenses] }))

  if (err) return <div className={`${card} mx-auto mt-10 max-w-md text-center`}>{err}</div>
  if (!d) return <div className="mt-20 text-center text-zinc-500">Loading your expenses…</div>
  const cName = new Map(d.categories.map((c) => [c.id, c.name]))
  const t = monthTotals(d.expenses, ym, d.categories)
  const rows = d.expenses.filter((e) => monthOf(e.expense_date) === ym).sort((a, b) => b.expense_date.localeCompare(a.expense_date))
  const groups = unbilledGroups(d.expenses, d.projects, d.crm)

  async function remove(e: Expense) {
    if (!confirm(`Delete ${e.vendor} (${fmtMoney(e.amount_cents)})?`)) return
    if (!d!.demo) { const r = await api(`/api/expenses/${e.id}`, 'DELETE'); if (!r.ok) return setToast(r.data.error) } else setToast(DEMO_NOTE)
    set((x) => ({ ...x, expenses: x.expenses.filter((y) => y.id !== e.id) }))
  }
  async function openReceipt(e: Expense) {
    if (d!.demo) return setToast('Demo receipts are samples, there is no file to open.')
    const w = window.open('', '_blank')
    const r = await api(`/api/expenses/${e.id}/receipt`, 'GET')
    if (!r.ok) { w?.close(); return setToast(r.data.error) }
    if (w) w.location.href = r.data.url; else window.location.href = r.data.url
  }

  return (
    <div className="pb-28 sm:pb-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-amber-500/15 via-zinc-950 to-black p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-2">
          <button className={btnGhost} aria-label="Previous month" onClick={() => setYm(addMonths(ym, -1))}><ChevronLeft size={16} /></button>
          <div className="min-w-0 flex-1 text-center font-semibold sm:flex-none sm:px-2">{niceMonth(ym)}</div>
          <button className={btnGhost} aria-label="Next month" onClick={() => setYm(addMonths(ym, 1))}><ChevronRight size={16} /></button>
          {ym !== monthOf(localDate()) && <button className={btnGhost} onClick={() => setYm(monthOf(localDate()))}>This month</button>}
        </div>
        <div className="relative mt-5 flex flex-col gap-5 sm:flex-row sm:items-end">
          <div className="flex-1">
            <div className="text-xs uppercase tracking-[0.2em] text-amber-200/80">Spent this month</div>
            <div className="mt-1 font-mono text-5xl font-extrabold tabular-nums tracking-tight sm:text-6xl" data-testid="month-total">{fmtMoney(t.cents)}</div>
            <div className="mt-1 text-sm text-zinc-300">{t.count} expense{t.count === 1 ? '' : 's'} · {fmtMoney(t.billable)} billable · <span className="text-amber-200">{fmtMoney(t.unbilled)} not billed yet</span></div>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <button className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 text-lg font-bold text-black transition hover:bg-amber-300 active:scale-[0.98] sm:flex-none" onClick={() => setEditing('new')}><Plus size={20} />Add expense</button>
            <a className={`${btnGhost} h-14 rounded-2xl`} href={`/api/expenses/export?from=${ym}-01&to=${monthEnd(ym)}`} aria-label="Download CSV"><Download size={16} className="mr-1" />CSV</a>
          </div>
        </div>
      </section>

      <nav className="sticky top-[57px] z-20 -mx-4 mt-5 flex gap-1 overflow-x-auto border-b border-white/10 bg-[#0a0a0c]/90 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-full sm:border sm:px-2" aria-label="Views">
        {(['expenses', 'totals', 'categories'] as Tab[]).map((x) => (
          <button key={x} onClick={() => setTab(x)} aria-current={tab === x ? 'page' : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold capitalize ${tab === x ? 'bg-white text-black' : 'text-zinc-300 hover:bg-white/10'}`}>{x}</button>
        ))}
      </nav>

      {tab === 'expenses' && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0 space-y-2">
            {!rows.length && <div className={`${card} text-center text-sm text-zinc-400`}>No expenses in {niceMonth(ym)} yet. <button className="underline" onClick={() => setEditing('new')}>Add one</button></div>}
            {rows.map((e) => {
              const to = billTo(e, d.projects, d.crm)
              return (
                <div key={e.id} className={`${card} flex items-start gap-3`} data-testid="expense-row">
                  <div className="hidden h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-400/15 text-amber-200 sm:grid"><Receipt size={18} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2"><div className="min-w-0 flex-1 truncate font-semibold">{e.vendor}</div><div className="font-mono font-bold tabular-nums">{fmtMoney(e.amount_cents)}</div></div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-zinc-400">
                      <span>{niceDate(e.expense_date)}</span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-zinc-200">{(e.category_id && cName.get(e.category_id)) || 'Uncategorized'}</span>
                      {to && <span className="truncate">· {to.name}</span>}
                      {e.billable && (e.invoice_id ? <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-cyan-200">Billed</span> : <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-amber-200">Billable</span>)}
                      {e.receipt_name && <button className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-zinc-200 hover:bg-white/20" onClick={() => openReceipt(e)}><Paperclip size={12} />Receipt</button>}
                    </div>
                    {e.note && <div className="mt-1 truncate text-sm text-zinc-300">{e.note}</div>}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                    <button aria-label="Edit expense" className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white" onClick={() => setEditing(e)}><Pencil size={16} /></button>
                    <button aria-label="Delete expense" className="rounded-full p-2 text-zinc-400 hover:bg-red-500/20 hover:text-red-300" onClick={() => remove(e)}><Trash2 size={16} /></button>
                  </div>
                </div>
              )
            })}
          </section>
          <aside className="min-w-0 space-y-4">
            <section className={card}>
              <h2 className="font-bold">Not billed yet</h2>
              <p className="text-xs text-zinc-500">Billable expenses, any month. Creates an unpaid invoice in Invoices. Nothing is sent.</p>
              {!groups.length && <p className="mt-3 text-sm text-zinc-400">Nothing to bill. Nice.</p>}
              {groups.map((g) => (
                <div key={g.to?.key || 'none'} className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-white/[0.03] p-3">
                  <div className="min-w-0 flex-1"><div className="truncate font-semibold">{g.to?.name || 'No client linked'}</div><div className="text-xs text-zinc-400">{g.items.length} expense{g.items.length === 1 ? '' : 's'} · {fmtMoney(g.cents)}</div></div>
                  <button className={btnPrimary} onClick={() => setInvoicing(g)}><FileText size={16} className="mr-1" />Add to invoice</button>
                </div>
              ))}
            </section>
            <CategoryBars t={t} />
          </aside>
        </div>
      )}
      {tab === 'totals' && <TotalsView d={d} ym={ym} t={t} />}
      {tab === 'categories' && <CategoriesView d={d} set={set} toast={setToast} />}

      <ExpenseModal d={d} expense={editing} ym={ym} onClose={() => setEditing(null)} toast={setToast}
        onSaved={(e) => { upsert(e); setEditing(null); if (monthOf(e.expense_date) !== ym) setYm(monthOf(e.expense_date)) }} upsert={upsert} />
      <InvoiceModal d={d} group={invoicing} onClose={() => setInvoicing(null)} toast={setToast}
        onDone={(ids, inv) => { set((x) => ({ ...x, expenses: x.expenses.map((e) => (ids.includes(e.id) ? { ...e, invoice_id: inv, invoiced_at: new Date().toISOString() } : e)) })); setInvoicing(null) }} />
      {toast && <div role="status" className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-2xl border border-white/10 bg-zinc-900/95 px-4 py-3 text-center text-sm shadow-2xl sm:bottom-6">{toast}</div>}
    </div>
  )
}

function CategoryBars({ t }: { t: ReturnType<typeof monthTotals> }) {
  const max = Math.max(1, ...t.categories.map((c) => c.cents))
  return (
    <section className={card}>
      <h2 className="font-bold">By category</h2>
      {!t.categories.length && <p className="mt-2 text-sm text-zinc-400">No spending this month.</p>}
      <div className="mt-3 space-y-3">
        {t.categories.map((c) => (
          <div key={c.category_id || 'none'} data-testid="cat-total">
            <div className="flex justify-between gap-2 text-sm"><span className="truncate">{c.name}</span><span className="font-mono tabular-nums">{fmtMoney(c.cents)}</span></div>
            <div className="mt-1 h-2 rounded-full bg-white/5"><div className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-300" style={{ width: `${Math.max(3, (c.cents / max) * 100)}%` }} /></div>
          </div>
        ))}
      </div>
    </section>
  )
}

function TotalsView({ d, ym, t }: { d: Data; ym: string; t: ReturnType<typeof monthTotals> }) {
  const series = monthSeries(d.expenses, ym, 6)
  const max = Math.max(1, ...series.map((s) => s.cents))
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className={`${card} min-w-0`}>
        <h2 className="font-bold">Last 6 months</h2>
        <div className="mt-4 grid grid-cols-6 items-end gap-2" style={{ height: 180 }}>
          {series.map((s) => (
            <div key={s.ym} className="flex h-full flex-col items-center justify-end gap-1">
              <span className="font-mono text-[10px] text-zinc-400 sm:text-xs">{s.cents ? fmtMoney(s.cents).replace(/\.\d\d$/, '') : ''}</span>
              <span className={`w-full rounded-t-lg ${s.ym === ym ? 'bg-amber-400' : 'bg-gradient-to-t from-amber-700/60 to-yellow-300/60'}`} style={{ height: `${Math.max(s.cents ? 6 : 2, (s.cents / max) * 130)}px` }} />
              <span className="text-[11px] text-zinc-400">{new Date(s.ym + '-15T12:00:00').toLocaleDateString(undefined, { month: 'short' })}</span>
            </div>
          ))}
        </div>
      </section>
      <CategoryBars t={t} />
    </div>
  )
}

function CategoriesView({ d, set, toast }: { d: Data; set: (f: (x: Data) => Data) => void; toast: (m: string) => void }) {
  const [name, setName] = useState('')
  const used = (id: string) => d.expenses.filter((e) => e.category_id === id).length
  async function add() {
    const n = name.trim(); if (!n) return
    if (d.demo) { set((x) => ({ ...x, categories: [...x.categories, { id: demoId(), name: n, archived: false }] })); setName(''); return toast(DEMO_NOTE) }
    const r = await api('/api/expenses/categories', 'POST', { name: n }); if (!r.ok) return toast(r.data.error)
    set((x) => ({ ...x, categories: [...x.categories, r.data.category].sort((a, b) => a.name.localeCompare(b.name)) })); setName('')
  }
  async function patch(c: Category, body: Partial<Category>) {
    if (d.demo) { set((x) => ({ ...x, categories: x.categories.map((y) => (y.id === c.id ? { ...y, ...body } : y)) })); return toast(DEMO_NOTE) }
    const r = await api(`/api/expenses/categories/${c.id}`, 'PATCH', body); if (!r.ok) return toast(r.data.error)
    set((x) => ({ ...x, categories: x.categories.map((y) => (y.id === c.id ? r.data.category : y)) }))
  }
  async function remove(c: Category) {
    const n = used(c.id)
    if (!confirm(n ? `Delete ${c.name}? Its ${n} expense${n === 1 ? '' : 's'} become Uncategorized.` : `Delete ${c.name}?`)) return
    if (!d.demo) { const r = await api(`/api/expenses/categories/${c.id}`, 'DELETE'); if (!r.ok) return toast(r.data.error) } else toast(DEMO_NOTE)
    set((x) => ({ ...x, categories: x.categories.filter((y) => y.id !== c.id), expenses: x.expenses.map((e) => (e.category_id === c.id ? { ...e, category_id: null } : e)) }))
  }
  return (
    <div className="mt-4 space-y-4">
      <section className={card}>
        <h2 className="font-bold">Add a category</h2>
        <div className="mt-3 flex gap-2"><input aria-label="Category name" className={`${input} h-11`} placeholder="e.g. Hosting" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} /><button className={btnPrimary} onClick={add}><Plus size={16} className="mr-1" />Add</button></div>
      </section>
      <section className={`${card} divide-y divide-white/5`}>
        {d.categories.map((c) => (
          <div key={c.id} className={`flex flex-wrap items-center gap-2 py-2 ${c.archived ? 'opacity-60' : ''}`}>
            <span className="min-w-0 basis-full truncate font-semibold sm:flex-1 sm:basis-0">{c.name}<span className="ml-2 text-xs font-normal text-zinc-500">{used(c.id)} expense{used(c.id) === 1 ? '' : 's'}</span></span>
            <button className="text-xs text-zinc-300 hover:underline" onClick={() => { const n = prompt('Rename category', c.name); if (n && n.trim() && n.trim() !== c.name) patch(c, { name: n.trim() }) }}>Rename</button>
            <button className="text-xs text-zinc-400 hover:underline" onClick={() => patch(c, { archived: !c.archived })}>{c.archived ? 'Unarchive' : 'Archive'}</button>
            <button aria-label={`Delete ${c.name}`} className="rounded-full p-1.5 text-zinc-500 hover:bg-red-500/20 hover:text-red-300" onClick={() => remove(c)}><Trash2 size={14} /></button>
          </div>
        ))}
      </section>
    </div>
  )
}

type Form = { expense_date: string; amount: string; vendor: string; category_id: string; link: string; billable: boolean; note: string }
function ExpenseModal({ d, expense, ym, onClose, onSaved, upsert, toast }: { d: Data; expense: Expense | 'new' | null; ym: string; onClose: () => void; onSaved: (e: Expense) => void; upsert: (e: Expense) => void; toast: (m: string) => void }) {
  const e = expense && expense !== 'new' ? expense : null
  const [f, setF] = useState<Form | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!expense) return
    const today = localDate()
    setF(e ? { expense_date: e.expense_date, amount: (e.amount_cents / 100).toFixed(2), vendor: e.vendor, category_id: e.category_id || '', link: e.tt_project_id ? `tt:${e.tt_project_id}` : e.crm_email ? `crm:${e.crm_email}` : '', billable: e.billable, note: e.note || '' }
      : { expense_date: monthOf(today) === ym ? today : `${ym}-01`, amount: '', vendor: '', category_id: '', link: '', billable: false, note: '' })
    setFile(null); setMsg('')
  }, [expense]) // eslint-disable-line react-hooks/exhaustive-deps
  const cats = useMemo(() => d.categories.filter((c) => !c.archived || c.id === e?.category_id), [d.categories, e])
  if (!f) return null
  const locked = !!e?.invoice_id
  const pickFile = (x: File | undefined) => {
    if (!x) return setFile(null)
    if (!RECEIPT_TYPES[x.type]) return setMsg('Receipts can be a photo (JPG, PNG, WebP, HEIC) or a PDF.')
    if (x.size > MAX_RECEIPT_BYTES) return setMsg('Receipts can be up to 10 MB.')
    setMsg(''); setFile(x)
  }
  async function save() {
    if (parseAmount(f!.amount) == null) return setMsg('Enter an amount like 12.50.')
    if (!f!.vendor.trim()) return setMsg('Add a vendor.')
    const body = { expense_date: f!.expense_date, amount: f!.amount, vendor: f!.vendor, category_id: f!.category_id || null, note: f!.note, billable: f!.billable,
      tt_project_id: f!.link.startsWith('tt:') ? f!.link.slice(3) : null, crm_email: f!.link.startsWith('crm:') ? f!.link.slice(4) : null }
    if (d.demo) {
      onSaved({ id: e?.id || demoId(), expense_date: body.expense_date, amount_cents: parseAmount(body.amount)!, vendor: body.vendor.trim(), category_id: body.category_id, crm_email: body.crm_email, tt_project_id: body.tt_project_id,
        billable: body.billable, note: body.note || null, receipt_name: file?.name || e?.receipt_name || null, receipt_mime: file?.type || e?.receipt_mime || null, receipt_bytes: file?.size || e?.receipt_bytes || null, invoice_id: e?.invoice_id || null, invoiced_at: e?.invoiced_at || null })
      return toast(DEMO_NOTE)
    }
    setBusy(true)
    const r = await api(e ? `/api/expenses/${e.id}` : '/api/expenses', e ? 'PATCH' : 'POST', body)
    if (!r.ok) { setBusy(false); return setMsg(r.data.error) }
    let saved: Expense = r.data.expense
    if (file) {
      const fd = new FormData(); fd.append('file', file)
      const u = await fetch(`/api/expenses/${saved.id}/receipt`, { method: 'POST', body: fd })
      const j = await u.json().catch(() => ({}))
      if (u.ok) saved = j.expense; else toast(`Expense saved, but the receipt didn't upload: ${j.error || 'try again'}`)
    }
    setBusy(false); onSaved(saved)
  }
  async function dropReceipt() {
    if (!e || !confirm('Remove this receipt?')) return
    if (d.demo) { upsert({ ...e, receipt_name: null, receipt_mime: null, receipt_bytes: null }); onClose(); return toast(DEMO_NOTE) }
    const r = await api(`/api/expenses/${e.id}/receipt`, 'DELETE'); if (!r.ok) return setMsg(r.data.error)
    upsert(r.data.expense); onClose()
  }
  return (
    <Modal open={!!expense} onClose={onClose} title={e ? 'Edit expense' : 'Add expense'}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">Amount<input inputMode="decimal" autoFocus={!e} className={`${input} mt-1 h-11 font-mono`} placeholder="0.00" value={f.amount} disabled={locked} onChange={(x) => setF({ ...f, amount: x.target.value })} /></label>
          <label className="block text-sm">Date<input type="date" className={`${input} mt-1 h-11`} value={f.expense_date} onChange={(x) => setF({ ...f, expense_date: x.target.value })} /></label>
        </div>
        <label className="block text-sm">Vendor<input className={`${input} mt-1 h-11`} maxLength={120} placeholder="Who did you pay?" value={f.vendor} onChange={(x) => setF({ ...f, vendor: x.target.value })} /></label>
        <label className="block text-sm">Category
          <select className={`${input} mt-1 h-11`} value={f.category_id} onChange={(x) => setF({ ...f, category_id: x.target.value })}>
            <option value="">Uncategorized</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="block text-sm">Client or project (optional)
          <select className={`${input} mt-1 h-11`} value={f.link} onChange={(x) => setF({ ...f, link: x.target.value })}>
            <option value="">None</option>
            {d.projects.length > 0 && <optgroup label="Time tracking projects">{d.projects.map((p) => <option key={p.id} value={`tt:${p.id}`}>{p.client_name} · {p.name}</option>)}</optgroup>}
            {d.crm.length > 0 && <optgroup label="CRM contacts">{d.crm.map((c) => <option key={c.email} value={`crm:${c.email}`}>{c.company || c.name || c.email}{(c.company || c.name) ? ` · ${c.email}` : ''}</option>)}</optgroup>}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.billable} disabled={locked} onChange={(x) => setF({ ...f, billable: x.target.checked })} />Billable to a client</label>
        <label className="block text-sm">Note<input className={`${input} mt-1 h-11`} maxLength={500} value={f.note} onChange={(x) => setF({ ...f, note: x.target.value })} /></label>
        <div className="rounded-xl border border-dashed border-white/15 p-3 text-sm">
          {e?.receipt_name && !file ? (
            <div className="flex flex-wrap items-center gap-2"><Paperclip size={14} /><span className="min-w-0 flex-1 truncate">{e.receipt_name}</span><button className="text-xs text-zinc-300 hover:underline" onClick={() => fileRef.current?.click()}>Replace</button><button className="text-xs text-red-300 hover:underline" onClick={dropReceipt}>Remove</button></div>
          ) : (
            <button type="button" className="flex w-full items-center gap-2 text-left text-zinc-300" onClick={() => fileRef.current?.click()}><Paperclip size={14} />{file ? <span className="truncate">{file.name}</span> : 'Attach a receipt (photo or PDF, up to 10 MB)'}</button>
          )}
          <input ref={fileRef} type="file" aria-label="Receipt file" accept="image/jpeg,image/png,image/webp,image/heic,application/pdf" capture={undefined} className="hidden" onChange={(x) => pickFile(x.target.files?.[0])} />
        </div>
        {locked && <p className="text-xs text-cyan-200">This expense is on an invoice, so the amount and billable are locked. Delete that invoice in Invoices to unlock it.</p>}
        {msg && <p className="text-sm text-red-300">{msg}</p>}
        <div className="flex justify-end gap-2"><button className={btnGhost} onClick={onClose}>Cancel</button><button className={btnPrimary} onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div>
      </div>
    </Modal>
  )
}

function InvoiceModal({ d, group, onClose, onDone, toast }: { d: Data; group: Group | null; onClose: () => void; onDone: (ids: string[], inv: string) => void; toast: (m: string) => void }) {
  const [pick, setPick] = useState<Set<string>>(new Set())
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { setPick(new Set(group?.items.map((e) => e.id) || [])); setMsg(''); setName(''); setEmail('') }, [group])
  if (!group) return null
  const chosen = group.items.filter((e) => pick.has(e.id))
  const cents = chosen.reduce((n, e) => n + e.amount_cents, 0)
  async function go() {
    if (!group!.to && !name.trim()) return setMsg('Who is this invoice for? Add a client name.')
    if (d.demo) { onDone(chosen.map((e) => e.id), '00000000-0000-4000-8000-0000000000f2'); return toast('Demo: no invoice was created.') }
    setBusy(true)
    const r = await api('/api/expenses/invoice', 'POST', { expense_ids: chosen.map((e) => e.id), client_name: name, client_email: email })
    setBusy(false)
    if (!r.ok) return setMsg(r.data.error)
    onDone(chosen.map((e) => e.id), r.data.invoice_id)
    toast(`Unpaid invoice created with ${r.data.lines} line${r.data.lines === 1 ? '' : 's'}. Open Invoices to review and send it.`)
  }
  return (
    <Modal open onClose={onClose} title={`Invoice ${group.to?.name || 'expenses'}`}>
      <div className="max-h-[40vh] space-y-1 overflow-y-auto">
        {group.items.map((e) => (
          <label key={e.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
            <input type="checkbox" checked={pick.has(e.id)} onChange={(x) => { const s = new Set(pick); if (x.target.checked) s.add(e.id); else s.delete(e.id); setPick(s) }} />
            <span className="min-w-0 flex-1 truncate">{e.vendor} <span className="text-zinc-500">· {e.expense_date}</span></span><span className="font-mono tabular-nums">{fmtMoney(e.amount_cents)}</span>
          </label>
        ))}
      </div>
      {!group.to && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input aria-label="Client name" className={`${input} h-11`} placeholder="Client name" maxLength={120} value={name} onChange={(x) => setName(x.target.value)} />
          <input aria-label="Client email" className={`${input} h-11`} placeholder="Client email (optional)" value={email} onChange={(x) => setEmail(x.target.value)} />
        </div>
      )}
      <p className="mt-3 text-sm text-zinc-200">{chosen.length} expense{chosen.length === 1 ? '' : 's'}, {fmtMoney(cents)}, one line each.</p>
      <p className="mt-1 text-xs text-zinc-500">Creates an unpaid invoice in Invoices and marks these expenses billed. Nothing is emailed. If you delete that invoice, they go back to not billed. Needs Invoices on your plan.</p>
      {msg && <p className="mt-2 text-sm text-red-300">{msg}</p>}
      <div className="mt-4 flex justify-end gap-2"><Link href="/invoices" className={btnGhost}>Open Invoices</Link><button className={btnPrimary} onClick={go} disabled={busy || !chosen.length}>{busy ? 'Creating…' : 'Create invoice'}</button></div>
    </Modal>
  )
}
