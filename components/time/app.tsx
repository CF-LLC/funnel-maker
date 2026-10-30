'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Play, Square, Plus, ChevronLeft, ChevronRight, Download, Receipt, Pencil, Trash2 } from 'lucide-react'
import { api, btnGhost, btnPrimary, card, input, Modal } from '@/components/emaillist/ui'
import {
  addDays, entryCents, entrySeconds, fmtDuration, fmtHours, fmtMoney, invoiceable, isRunning, localDate, rateFor, totals, weekStart,
  type Client, type Entry, type Project, type Settings, type Total,
} from '@/lib/time/core'

type Crm = { email: string; name: string | null; company: string | null }
type Data = { demo: boolean; settings: Settings; clients: Client[]; projects: Project[]; entries: Entry[]; crm: Crm[] }
type Tab = 'day' | 'week' | 'clients' | 'settings'
const DEMO_NOTE = 'Demo: shown here only, nothing is saved.'
let demoSeq = 0
const demoId = () => `00000000-0000-4000-8000-${String(Date.now() % 1e9).padStart(9, '0')}${String(++demoSeq % 1000).padStart(3, '0')}`

export function TimeApp() {
  const [d, setD] = useState<Data | null>(null)
  const [err, setErr] = useState('')
  const [toast, setToast] = useState('')
  const [tab, setTab] = useState<Tab>('day')
  const [day, setDay] = useState(localDate())
  const [now, setNow] = useState(Date.now())
  const [editing, setEditing] = useState<Entry | 'new' | null>(null)
  const [invoicing, setInvoicing] = useState<Client | null>(null)

  const load = useCallback(async () => {
    const r = await api('/api/time', 'GET')
    if (r.ok) setD(r.data); else setErr(r.data.error || 'Could not load.')
  }, [])
  useEffect(() => { load() }, [load])
  const running = d?.entries.find(isRunning) || null
  useEffect(() => { if (!running) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [running])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3500); return () => clearTimeout(t) }, [toast])
  useEffect(() => {
    if (typeof document === 'undefined') return
    const base = 'Time tracking · SaaS Nation'
    document.title = running ? `${fmtDuration(entrySeconds(running, now), true)} · ${base}` : base
  }, [running, now])

  const set = (f: (x: Data) => Data) => setD((x) => (x ? f(x) : x))
  const upsertEntry = (e: Entry) => set((x) => ({ ...x, entries: x.entries.some((y) => y.id === e.id) ? x.entries.map((y) => (y.id === e.id ? e : y)) : [e, ...x.entries] }))
  const fail = (m: string) => setToast(m)

  if (err) return <div className={`${card} mx-auto mt-10 max-w-md text-center`}>{err}</div>
  if (!d) return <div className="mt-20 text-center text-zinc-500">Loading your time…</div>
  const pById = new Map(d.projects.map((p) => [p.id, p]))
  const cById = new Map(d.clients.map((c) => [c.id, c]))
  const activeProjects = d.projects.filter((p) => !p.archived && !cById.get(p.client_id)?.archived)
  const label = (pid: string) => { const p = pById.get(pid); const c = p && cById.get(p.client_id); return p ? `${c?.name || ''} · ${p.name}` : 'Unknown project' }

  async function start(project_id: string, note: string) {
    if (d!.demo) { upsertEntry({ id: demoId(), project_id, entry_date: localDate(), started_at: new Date().toISOString(), seconds: null, note: note || null, billable: pById.get(project_id)?.billable ?? true, invoice_id: null, invoiced_at: null }); setNow(Date.now()); return setToast(DEMO_NOTE) }
    const r = await api('/api/time/timer', 'POST', { action: 'start', project_id, note, entry_date: localDate() })
    if (!r.ok) { load(); return fail(r.data.error) }
    upsertEntry(r.data.entry); setNow(Date.now())
  }
  async function stop(note: string) {
    if (!running) return
    if (d!.demo) { upsertEntry({ ...running, seconds: entrySeconds(running), note: note || null }); return setToast(DEMO_NOTE) }
    const r = await api('/api/time/timer', 'POST', { action: 'stop', note })
    if (!r.ok) { load(); return fail(r.data.error) }
    upsertEntry(r.data.entry)
    if (r.data.capped) setToast('Timer ran past 24 hours, so it was saved as 24:00. Edit it if that is wrong.')
  }
  async function removeEntry(e: Entry) {
    if (!confirm('Delete this time entry?')) return
    if (!d!.demo) { const r = await api(`/api/time/entries/${e.id}`, 'DELETE'); if (!r.ok) return fail(r.data.error) } else setToast(DEMO_NOTE)
    set((x) => ({ ...x, entries: x.entries.filter((y) => y.id !== e.id) }))
  }

  const dayEntries = d.entries.filter((e) => e.entry_date === day)
  const ws = weekStart(day)
  const weekEntries = d.entries.filter((e) => e.entry_date >= ws && e.entry_date <= addDays(ws, 6))
  const cur = d.settings.currency

  return (
    <div className="pb-28 sm:pb-6">
      <TimerCard d={d} running={running} now={now} projects={activeProjects} label={label} onStart={start} onStop={stop} />
      {!d.projects.length && (
        <div className={`${card} mt-4 text-sm text-zinc-300`}>Add a client and a project first, then start the timer. <button className="ml-1 underline" onClick={() => setTab('clients')}>Add a client</button></div>
      )}
      <nav className="sticky top-[57px] z-20 -mx-4 mt-5 flex gap-1 overflow-x-auto border-b border-white/10 bg-[#0a0a0c]/90 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-full sm:border sm:px-2" aria-label="Views">
        {(['day', 'week', 'clients', 'settings'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} aria-current={tab === t ? 'page' : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold capitalize ${tab === t ? 'bg-white text-black' : 'text-zinc-300 hover:bg-white/10'}`}>{t === 'clients' ? 'Clients & projects' : t}</button>
        ))}
      </nav>

      {(tab === 'day' || tab === 'week') && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className={btnGhost} aria-label="Previous" onClick={() => setDay(addDays(day, tab === 'day' ? -1 : -7))}><ChevronLeft size={16} /></button>
          <div className="min-w-0 flex-1 text-center font-semibold sm:flex-none sm:px-2">
            {tab === 'day' ? niceDay(day) : `${niceDay(ws, true)} – ${niceDay(addDays(ws, 6), true)}`}
          </div>
          <button className={btnGhost} aria-label="Next" onClick={() => setDay(addDays(day, tab === 'day' ? 1 : 7))}><ChevronRight size={16} /></button>
          {day !== localDate() && <button className={btnGhost} onClick={() => setDay(localDate())}>Today</button>}
          <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
            <button className={`${btnGhost} flex-1 sm:flex-none`} onClick={() => setEditing('new')} disabled={!activeProjects.length}><Plus size={16} className="mr-1" />Add time</button>
            <a className={`${btnGhost} flex-1 sm:flex-none`} href={`/api/time/export?from=${tab === 'day' ? day : ws}&to=${tab === 'day' ? day : addDays(ws, 6)}`}><Download size={16} className="mr-1" />CSV</a>
          </div>
        </div>
      )}

      {tab === 'day' && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0 space-y-2">
            {!dayEntries.length && <div className={`${card} text-center text-sm text-zinc-400`}>No time on this day yet.</div>}
            {dayEntries.map((e) => (
              <EntryRow key={e.id} e={e} label={label(e.project_id)} sec={entrySeconds(e, now)} money={fmtMoney(entryCents(e, pById.get(e.project_id), d.settings, now), cur)}
                onEdit={() => setEditing(e)} onDelete={() => removeEntry(e)} />
            ))}
          </section>
          <Totals t={totals(dayEntries, d.projects, d.clients, d.settings, now)} cur={cur} />
        </div>
      )}

      {tab === 'week' && (
        <WeekView d={d} ws={ws} entries={weekEntries} now={now} label={label} onDay={(x) => { setDay(x); setTab('day') }} onInvoice={setInvoicing} />
      )}

      {tab === 'clients' && <ClientsView d={d} set={set} toast={setToast} />}
      {tab === 'settings' && <SettingsView d={d} set={set} toast={setToast} />}

      <EntryModal d={d} entry={editing} projects={activeProjects} label={label} day={day} onClose={() => setEditing(null)}
        onSaved={(e) => { upsertEntry(e); setEditing(null) }} toast={setToast} />
      <InvoiceModal d={d} client={invoicing} onClose={() => setInvoicing(null)} toast={setToast}
        onDone={(ids, invId) => { set((x) => ({ ...x, entries: x.entries.map((e) => (ids.includes(e.id) ? { ...e, invoice_id: invId, invoiced_at: new Date().toISOString() } : e)) })); setInvoicing(null) }} />
      {toast && <div role="status" className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-2xl border border-white/10 bg-zinc-900/95 px-4 py-3 text-center text-sm shadow-2xl sm:bottom-6">{toast}</div>}
    </div>
  )
}

function niceDay(iso: string, short = false) {
  const dt = new Date(iso + 'T12:00:00')
  if (!short && iso === localDate()) return 'Today'
  return dt.toLocaleDateString(undefined, short ? { month: 'short', day: 'numeric' } : { weekday: 'long', month: 'short', day: 'numeric' })
}

function TimerCard({ d, running, now, projects, label, onStart, onStop }: {
  d: Data; running: Entry | null; now: number; projects: Project[]; label: (id: string) => string
  onStart: (pid: string, note: string) => Promise<void>; onStop: (note: string) => Promise<void>
}) {
  const [pid, setPid] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (running) setNote(running.note || '') }, [running?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!pid && projects[0]) setPid(projects[0].id) }, [projects, pid])
  const sec = running ? entrySeconds(running, now) : 0
  const go = async () => { setBusy(true); try { if (running) { await onStop(note); setNote('') } else if (pid) await onStart(pid, note) } finally { setBusy(false) } }
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/15 via-[#101014] to-cyan-500/10 p-5 shadow-[0_0_80px_-30px_rgba(16,185,129,0.6)] sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">{running ? 'Running' : 'Timer'}</div>
          <div className="mt-1 font-mono text-5xl font-extrabold tabular-nums tracking-tight sm:text-6xl" aria-live="off">{fmtDuration(sec, true)}</div>
          {running && <div className="mt-1 truncate text-sm text-zinc-300">{label(running.project_id)}</div>}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-[340px]">
          {!running && (
            <select aria-label="Project" className={`${input} h-12 text-base`} value={pid} onChange={(e) => setPid(e.target.value)} disabled={!projects.length}>
              {!projects.length && <option value="">No projects yet</option>}
              {projects.map((p) => <option key={p.id} value={p.id}>{label(p.id)}</option>)}
            </select>
          )}
          <input aria-label="What are you working on?" className={`${input} h-12 text-base`} placeholder="What are you working on?" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
          <button onClick={go} disabled={busy || (!running && !pid)}
            className={`inline-flex h-14 items-center justify-center gap-2 rounded-2xl text-lg font-bold transition active:scale-[0.98] disabled:opacity-50 ${running ? 'bg-red-500 text-white hover:bg-red-400' : 'bg-emerald-400 text-black hover:bg-emerald-300'}`}>
            {running ? <><Square size={20} fill="currentColor" />Stop</> : <><Play size={20} fill="currentColor" />Start</>}
          </button>
        </div>
      </div>
      {d.demo && <p className="mt-3 text-xs text-zinc-400">Demo: the timer runs here, but nothing is saved.</p>}
    </section>
  )
}

function Badge({ e }: { e: Entry }) {
  if (isRunning(e)) return <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">running</span>
  if (!e.billable) return <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-zinc-400">non-billable</span>
  return e.invoice_id
    ? <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-[11px] font-semibold text-cyan-200">billed</span>
    : <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200">unbilled</span>
}

function EntryRow({ e, label, sec, money, onEdit, onDelete }: { e: Entry; label: string; sec: number; money: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className={`${card} flex items-center gap-2 sm:gap-3`}>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{label}</div>
        <div className="truncate text-sm text-zinc-400">{e.note || <span className="italic text-zinc-600">No note</span>}</div>
        <div className="mt-1 flex items-center gap-2"><Badge e={e} />{e.billable && <span className="text-xs text-zinc-500">{money}</span>}</div>
      </div>
      <div className="shrink-0 font-mono text-base font-bold tabular-nums sm:text-lg">{fmtDuration(sec)}</div>
      {!isRunning(e) && (
        <div className="flex flex-col gap-1 sm:flex-row">
          <button aria-label="Edit entry" onClick={onEdit} className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white"><Pencil size={16} /></button>
          {!e.invoice_id && <button aria-label="Delete entry" onClick={onDelete} className="rounded-full p-2 text-zinc-400 hover:bg-red-500/20 hover:text-red-300"><Trash2 size={16} /></button>}
        </div>
      )}
    </div>
  )
}

function Totals({ t, cur, title = 'Totals' }: { t: ReturnType<typeof totals>; cur: string; title?: string }) {
  const list = (name: string, rows: Total[]) => (
    <div className="mt-4">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{name}</div>
      {!rows.length && <div className="mt-1 text-sm text-zinc-600">Nothing yet</div>}
      {rows.map((r) => (
        <div key={r.id} className="mt-2 flex items-baseline gap-2 text-sm">
          <span className="min-w-0 flex-1 truncate">{r.name}</span><span className="font-mono tabular-nums text-zinc-300">{fmtHours(r.seconds)}h</span>
          <span className="w-24 text-right font-mono tabular-nums text-zinc-400">{fmtMoney(r.cents, cur)}</span>
        </div>
      ))}
    </div>
  )
  return (
    <aside className={`${card} h-fit`}>
      <div className="text-xs uppercase tracking-wider text-zinc-400">{title}</div>
      <div className="mt-1 flex items-baseline justify-between"><span className="font-mono text-3xl font-extrabold tabular-nums">{fmtDuration(t.seconds)}</span><span className="text-lg font-bold text-emerald-300">{fmtMoney(t.cents, cur)}</span></div>
      <div className="text-xs text-zinc-500">{fmtMoney(t.unbilledCents, cur)} unbilled</div>
      {list('By client', t.clients)}
      {list('By project', t.projects)}
    </aside>
  )
}

function WeekView({ d, ws, entries, now, label, onDay, onInvoice }: { d: Data; ws: string; entries: Entry[]; now: number; label: (id: string) => string; onDay: (iso: string) => void; onInvoice: (c: Client) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i))
  const per = days.map((x) => entries.filter((e) => e.entry_date === x).reduce((n, e) => n + entrySeconds(e, now), 0))
  const max = Math.max(3600, ...per)
  const pById = new Map(d.projects.map((p) => [p.id, p]))
  const unbilledByClient = d.clients.map((c) => {
    const es = invoiceable(d.entries).filter((e) => pById.get(e.project_id)?.client_id === c.id)
    return { c, es, cents: es.reduce((n, e) => n + entryCents(e, pById.get(e.project_id), d.settings), 0), sec: es.reduce((n, e) => n + (e.seconds || 0), 0) }
  }).filter((x) => x.es.length)
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        <section className={card}>
          <div className="grid grid-cols-7 items-end gap-2" style={{ height: 160 }}>
            {days.map((x, i) => (
              <button key={x} onClick={() => onDay(x)} className="group flex h-full flex-col items-center justify-end gap-1" aria-label={`${niceDay(x)}: ${fmtDuration(per[i])}`}>
                <span className="font-mono text-[10px] text-zinc-400 sm:text-xs">{per[i] ? fmtDuration(per[i]) : ''}</span>
                <span className={`w-full rounded-t-lg ${x === localDate() ? 'bg-emerald-400' : 'bg-gradient-to-t from-cyan-500/60 to-emerald-400/70'} group-hover:opacity-80`} style={{ height: `${Math.max(per[i] ? 6 : 2, (per[i] / max) * 110)}px` }} />
                <span className="text-[11px] text-zinc-400">{new Date(x + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' })}</span>
              </button>
            ))}
          </div>
        </section>
        <section className={card}>
          <h2 className="font-bold">Unbilled time</h2>
          <p className="text-xs text-zinc-500">All unbilled, billable time per client (any week). Creates an unpaid invoice in Invoices. Nothing is sent.</p>
          {!unbilledByClient.length && <p className="mt-3 text-sm text-zinc-400">Nothing unbilled. Nice.</p>}
          {unbilledByClient.map(({ c, es, cents, sec }) => (
            <div key={c.id} className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-white/[0.03] p-3">
              <div className="min-w-0 flex-1"><div className="truncate font-semibold">{c.name}</div><div className="text-xs text-zinc-400">{es.length} entries · {fmtHours(sec)}h · {fmtMoney(cents, d.settings.currency)}</div></div>
              <button className={btnPrimary} onClick={() => onInvoice(c)}><Receipt size={16} className="mr-1" />Create invoice</button>
            </div>
          ))}
        </section>
        <section className="min-w-0 space-y-2">
          {entries.filter((e) => !isRunning(e)).sort((a, b) => b.entry_date.localeCompare(a.entry_date)).slice(0, 50).map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm">
              <span className="w-12 shrink-0 text-xs text-zinc-500">{new Date(e.entry_date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' })}</span>
              <span className="min-w-0 flex-1 truncate">{label(e.project_id)}{e.note ? <span className="text-zinc-500"> · {e.note}</span> : null}</span>
              <Badge e={e} /><span className="font-mono tabular-nums">{fmtDuration(e.seconds || 0)}</span>
            </div>
          ))}
        </section>
      </div>
      <Totals t={totals(entries, d.projects, d.clients, d.settings, now)} cur={d.settings.currency} title="This week" />
    </div>
  )
}

function EntryModal({ d, entry, projects, label, day, onClose, onSaved, toast }: {
  d: Data; entry: Entry | 'new' | null; projects: Project[]; label: (id: string) => string; day: string; onClose: () => void; onSaved: (e: Entry) => void; toast: (m: string) => void
}) {
  const e = entry && entry !== 'new' ? entry : null
  const [f, setF] = useState({ project_id: '', entry_date: day, duration: '', note: '', billable: true })
  const [msg, setMsg] = useState('')
  useEffect(() => {
    if (!entry) return
    setMsg('')
    if (e) setF({ project_id: e.project_id, entry_date: e.entry_date, duration: fmtDuration(e.seconds || 0), note: e.note || '', billable: e.billable })
    else setF({ project_id: projects[0]?.id || '', entry_date: day, duration: '', note: '', billable: projects[0]?.billable ?? true })
  }, [entry]) // eslint-disable-line react-hooks/exhaustive-deps
  const locked = !!e?.invoice_id
  const save = async () => {
    if (d.demo) {
      const { parseDuration } = await import('@/lib/time/core')
      const sec = parseDuration(f.duration); if (sec == null) return setMsg('Enter a duration like 1:30, 90m or 1.5h.')
      onSaved({ ...(e || { id: demoId(), started_at: null, invoice_id: null, invoiced_at: null }), project_id: f.project_id, entry_date: f.entry_date, seconds: sec, note: f.note || null, billable: f.billable } as Entry)
      return toast(DEMO_NOTE)
    }
    const r = e ? await api(`/api/time/entries/${e.id}`, 'PATCH', locked ? { entry_date: f.entry_date, note: f.note } : f) : await api('/api/time/entries', 'POST', f)
    if (!r.ok) return setMsg(r.data.error)
    onSaved(r.data.entry)
  }
  const opts = e && !projects.some((p) => p.id === e.project_id) ? [{ id: e.project_id } as Project, ...projects] : projects
  return (
    <Modal open={!!entry} onClose={onClose} title={e ? 'Edit time' : 'Add time'}>
      <div className="space-y-3">
        <label className="block text-sm">Project
          <select className={`${input} mt-1 h-11`} value={f.project_id} disabled={locked} onChange={(x) => { const p = projects.find((y) => y.id === x.target.value); setF({ ...f, project_id: x.target.value, billable: p?.billable ?? f.billable }) }}>
            {opts.map((p) => <option key={p.id} value={p.id}>{label(p.id)}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">Date<input type="date" className={`${input} mt-1 h-11`} value={f.entry_date} onChange={(x) => setF({ ...f, entry_date: x.target.value })} /></label>
          <label className="block text-sm">Duration<input inputMode="decimal" className={`${input} mt-1 h-11`} placeholder="1:30 or 1.5h" value={f.duration} disabled={locked} onChange={(x) => setF({ ...f, duration: x.target.value })} /></label>
        </div>
        <label className="block text-sm">Note<input className={`${input} mt-1 h-11`} maxLength={500} value={f.note} onChange={(x) => setF({ ...f, note: x.target.value })} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.billable} disabled={locked} onChange={(x) => setF({ ...f, billable: x.target.checked })} />Billable</label>
        {locked && <p className="text-xs text-cyan-200">This time is on an invoice, so hours and project are locked. Delete that invoice in Invoices to unlock it.</p>}
        {msg && <p className="text-sm text-red-300">{msg}</p>}
        <div className="flex justify-end gap-2"><button className={btnGhost} onClick={onClose}>Cancel</button><button className={btnPrimary} onClick={save} disabled={!f.project_id}>Save</button></div>
      </div>
    </Modal>
  )
}

function InvoiceModal({ d, client, onClose, onDone, toast }: { d: Data; client: Client | null; onClose: () => void; onDone: (ids: string[], invId: string) => void; toast: (m: string) => void }) {
  const [mode, setMode] = useState<'project' | 'entry'>('project')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { setMsg('') }, [client])
  const pById = useMemo(() => new Map(d.projects.map((p) => [p.id, p])), [d.projects])
  const es = client ? invoiceable(d.entries).filter((e) => pById.get(e.project_id)?.client_id === client.id) : []
  const noRate = es.some((e) => !rateFor(pById.get(e.project_id), d.settings))
  const go = async () => {
    if (!client) return
    if (d.demo) { onDone(es.map((e) => e.id), '00000000-0000-4000-8000-0000000000f2'); return toast('Demo: no invoice was created.') }
    setBusy(true)
    const r = await api('/api/time/invoice', 'POST', { client_id: client.id, mode, entry_ids: es.map((e) => e.id) })
    setBusy(false)
    if (!r.ok) return setMsg(r.data.error)
    onDone(es.map((e) => e.id), r.data.invoice_id)
    toast(`Unpaid invoice created with ${r.data.lines} line${r.data.lines === 1 ? '' : 's'}. Open Invoices to review and send it.`)
  }
  return (
    <Modal open={!!client} onClose={onClose} title={`Invoice ${client?.name || ''}`}>
      <p className="text-sm text-zinc-300">{es.length} unbilled entries, {fmtHours(es.reduce((n, e) => n + (e.seconds || 0), 0))}h, {fmtMoney(es.reduce((n, e) => n + entryCents(e, pById.get(e.project_id), d.settings), 0), d.settings.currency)}.</p>
      <fieldset className="mt-4 space-y-2 text-sm">
        <legend className="mb-1 text-xs uppercase tracking-wider text-zinc-500">Lines</legend>
        <label className="flex items-center gap-2"><input type="radio" checked={mode === 'project'} onChange={() => setMode('project')} />One line per project</label>
        <label className="flex items-center gap-2"><input type="radio" checked={mode === 'entry'} onChange={() => setMode('entry')} />One line per entry</label>
      </fieldset>
      <p className="mt-3 text-xs text-zinc-500">Creates an unpaid invoice in Invoices and marks this time billed. Nothing is emailed. If you delete that invoice, the time goes back to unbilled. Needs Invoices on your plan.</p>
      {noRate && <p className="mt-2 text-sm text-amber-300">Some projects have no rate. Set one on the project or a default in Settings.</p>}
      {msg && <p className="mt-2 text-sm text-red-300">{msg}</p>}
      <div className="mt-4 flex justify-end gap-2"><Link href="/invoices" className={btnGhost}>Open Invoices</Link><button className={btnPrimary} onClick={go} disabled={busy || !es.length || noRate}>{busy ? 'Creating…' : 'Create invoice'}</button></div>
    </Modal>
  )
}

function ClientsView({ d, set, toast }: { d: Data; set: (f: (x: Data) => Data) => void; toast: (m: string) => void }) {
  const [name, setName] = useState('')
  const [crm, setCrm] = useState('')
  const [proj, setProj] = useState<{ client_id: string; name: string; hourly_rate: string; billable: boolean } | null>(null)
  const [msg, setMsg] = useState('')
  const used = new Set(d.clients.map((c) => c.crm_email).filter(Boolean))
  const addClient = async () => {
    setMsg('')
    if (d.demo) {
      const ct = d.crm.find((x) => x.email === crm)
      const n = name.trim() || ct?.company || ct?.name || ct?.email || ''
      if (!n) return setMsg('Give the client a name.')
      set((x) => ({ ...x, clients: [...x.clients, { id: demoId(), name: n, email: ct?.email || null, crm_email: ct?.email || null, archived: false }] }))
      setName(''); setCrm(''); return toast(DEMO_NOTE)
    }
    const r = await api('/api/time/clients', 'POST', { name, crm_email: crm || undefined })
    if (!r.ok) return setMsg(r.data.error)
    set((x) => ({ ...x, clients: [...x.clients, r.data.client] })); setName(''); setCrm('')
  }
  const addProject = async () => {
    if (!proj) return
    if (d.demo) {
      const rate = proj.hourly_rate.trim() ? Math.round(Number(proj.hourly_rate) * 100) : null
      if (!proj.name.trim()) return setMsg('Give the project a name.')
      set((x) => ({ ...x, projects: [...x.projects, { id: demoId(), client_id: proj.client_id, name: proj.name.trim(), hourly_rate_cents: Number.isFinite(rate as number) ? rate : null, billable: proj.billable, archived: false }] }))
      setProj(null); return toast(DEMO_NOTE)
    }
    const r = await api('/api/time/projects', 'POST', proj)
    if (!r.ok) return setMsg(r.data.error)
    set((x) => ({ ...x, projects: [...x.projects, r.data.project] })); setProj(null)
  }
  const patchProject = async (p: Project, patch: Record<string, unknown>) => {
    if (d.demo) { set((x) => ({ ...x, projects: x.projects.map((y) => (y.id === p.id ? { ...y, ...(patch as Partial<Project>) } : y)) })); return toast(DEMO_NOTE) }
    const r = await api(`/api/time/projects/${p.id}`, 'PATCH', patch)
    if (!r.ok) return toast(r.data.error)
    set((x) => ({ ...x, projects: x.projects.map((y) => (y.id === p.id ? r.data.project : y)) }))
  }
  const editRate = (p: Project) => {
    const v = prompt('Hourly rate for this project (leave empty to use your default):', p.hourly_rate_cents != null ? String(p.hourly_rate_cents / 100) : '')
    if (v === null) return
    const cents = v.trim() ? Math.round(Number(v.replace(/[$,\s]/g, '')) * 100) : null
    if (cents !== null && !Number.isFinite(cents)) return toast('Enter a number like 85 or 85.50.')
    patchProject(p, d.demo ? { hourly_rate_cents: cents } : { hourly_rate: v })
  }
  const remove = async (kind: 'clients' | 'projects', id: string) => {
    if (!confirm(kind === 'clients' ? 'Delete this client, its projects and all their time?' : 'Delete this project and all its time?')) return
    if (!d.demo) { const r = await api(`/api/time/${kind}/${id}`, 'DELETE'); if (!r.ok) return toast(r.data.error) } else toast(DEMO_NOTE)
    set((x) => {
      const gone = kind === 'clients' ? new Set(x.projects.filter((p) => p.client_id === id).map((p) => p.id)) : new Set([id])
      return { ...x, clients: kind === 'clients' ? x.clients.filter((c) => c.id !== id) : x.clients, projects: x.projects.filter((p) => !gone.has(p.id)), entries: x.entries.filter((e) => !gone.has(e.project_id)) }
    })
  }
  const archiveClient = async (c: Client) => {
    if (!d.demo) { const r = await api(`/api/time/clients/${c.id}`, 'PATCH', { archived: !c.archived }); if (!r.ok) return toast(r.data.error) } else toast(DEMO_NOTE)
    set((x) => ({ ...x, clients: x.clients.map((y) => (y.id === c.id ? { ...y, archived: !c.archived } : y)) }))
  }
  const cur = d.settings.currency
  return (
    <div className="mt-4 space-y-4">
      <section className={card}>
        <h2 className="font-bold">Add a client</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <select aria-label="Pick a CRM contact" className={`${input} h-11`} value={crm} onChange={(e) => setCrm(e.target.value)}>
            <option value="">Pick a CRM contact (optional)</option>
            {d.crm.filter((c) => !used.has(c.email)).map((c) => <option key={c.email} value={c.email}>{c.company || c.name || c.email}{(c.company || c.name) ? ` · ${c.email}` : ''}</option>)}
          </select>
          <input aria-label="Client name" className={`${input} h-11`} placeholder={crm ? 'Name (optional, uses the contact)' : 'Or type a client name'} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addClient()} />
          <button className={btnPrimary} onClick={addClient}><Plus size={16} className="mr-1" />Add client</button>
        </div>
        {msg && !proj && <p className="mt-2 text-sm text-red-300">{msg}</p>}
      </section>
      {!d.clients.length && <p className="text-center text-sm text-zinc-500">No clients yet.</p>}
      {d.clients.map((c) => (
        <section key={c.id} className={`${card} ${c.archived ? 'opacity-60' : ''}`}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 basis-full truncate text-lg font-bold sm:flex-1 sm:basis-0">{c.name}{c.crm_email && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 align-middle text-[11px] font-normal text-zinc-300">CRM</span>}{c.archived && <span className="ml-2 text-xs font-normal text-zinc-500">archived</span>}</h3>
            <button className={btnGhost} onClick={() => setProj({ client_id: c.id, name: '', hourly_rate: '', billable: true })}><Plus size={14} className="mr-1" />Project</button>
            <button className={btnGhost} onClick={() => archiveClient(c)}>{c.archived ? 'Unarchive' : 'Archive'}</button>
            <button aria-label={`Delete ${c.name}`} className="rounded-full p-2 text-zinc-400 hover:bg-red-500/20 hover:text-red-300" onClick={() => remove('clients', c.id)}><Trash2 size={16} /></button>
          </div>
          <div className="mt-3 space-y-2">
            {d.projects.filter((p) => p.client_id === c.id).map((p) => (
              <div key={p.id} className={`flex flex-wrap items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2 text-sm ${p.archived ? 'opacity-60' : ''}`}>
                <span className="min-w-0 basis-full truncate font-semibold sm:flex-1 sm:basis-0">{p.name}</span>
                <button className="rounded-full border border-white/10 px-3 py-1 text-xs hover:bg-white/10" onClick={() => editRate(p)}>
                  {p.hourly_rate_cents != null ? `${fmtMoney(p.hourly_rate_cents, cur)}/h` : d.settings.default_rate_cents != null ? `Default ${fmtMoney(d.settings.default_rate_cents, cur)}/h` : 'Set rate'}
                </button>
                <label className="flex items-center gap-1 text-xs text-zinc-300"><input type="checkbox" checked={p.billable} onChange={(e) => patchProject(p, { billable: e.target.checked })} />Billable</label>
                <button className="text-xs text-zinc-400 hover:underline" onClick={() => patchProject(p, { archived: !p.archived })}>{p.archived ? 'Unarchive' : 'Archive'}</button>
                <button aria-label={`Delete ${p.name}`} className="rounded-full p-1.5 text-zinc-500 hover:bg-red-500/20 hover:text-red-300" onClick={() => remove('projects', p.id)}><Trash2 size={14} /></button>
              </div>
            ))}
            {!d.projects.some((p) => p.client_id === c.id) && <p className="text-sm text-zinc-500">No projects yet.</p>}
          </div>
        </section>
      ))}
      <Modal open={!!proj} onClose={() => { setProj(null); setMsg('') }} title="New project">
        {proj && (
          <div className="space-y-3">
            <label className="block text-sm">Name<input autoFocus className={`${input} mt-1 h-11`} maxLength={120} value={proj.name} onChange={(e) => setProj({ ...proj, name: e.target.value })} /></label>
            <label className="block text-sm">Hourly rate ({cur}, optional)<input inputMode="decimal" className={`${input} mt-1 h-11`} placeholder={d.settings.default_rate_cents != null ? `Default ${(d.settings.default_rate_cents / 100).toFixed(2)}` : 'e.g. 85'} value={proj.hourly_rate} onChange={(e) => setProj({ ...proj, hourly_rate: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={proj.billable} onChange={(e) => setProj({ ...proj, billable: e.target.checked })} />Billable</label>
            {msg && <p className="text-sm text-red-300">{msg}</p>}
            <div className="flex justify-end gap-2"><button className={btnGhost} onClick={() => setProj(null)}>Cancel</button><button className={btnPrimary} onClick={addProject}>Add project</button></div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function SettingsView({ d, set, toast }: { d: Data; set: (f: (x: Data) => Data) => void; toast: (m: string) => void }) {
  const [rate, setRate] = useState(d.settings.default_rate_cents != null ? String(d.settings.default_rate_cents / 100) : '')
  const [currency, setCurrency] = useState(d.settings.currency)
  const save = async () => {
    if (d.demo) { set((x) => ({ ...x, settings: { default_rate_cents: rate.trim() ? Math.round(Number(rate) * 100) : null, currency } })); return toast(DEMO_NOTE) }
    const r = await api('/api/time/settings', 'PUT', { default_rate: rate, currency })
    if (!r.ok) return toast(r.data.error)
    set((x) => ({ ...x, settings: r.data.settings })); toast('Saved.')
  }
  return (
    <section className={`${card} mt-4 max-w-lg space-y-3`}>
      <h2 className="font-bold">Settings</h2>
      <label className="block text-sm">Default hourly rate<input inputMode="decimal" className={`${input} mt-1 h-11`} placeholder="e.g. 85" value={rate} onChange={(e) => setRate(e.target.value)} /></label>
      <p className="text-xs text-zinc-500">Used for projects without their own rate.</p>
      <label className="block text-sm">Currency
        <select className={`${input} mt-1 h-11`} value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'NZD'].map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <button className={btnPrimary} onClick={save}>Save</button>
    </section>
  )
}
