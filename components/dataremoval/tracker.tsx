'use client'
import { useMemo, useState } from 'react'
import { CalendarPlus, ExternalLink, Mail, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { VISIBLE_BROKERS } from '@/lib/dataremoval/brokers'
import { buildRecheckIcs, buildRecheckMailto, cleanName, STATUSES, STATUS_LABEL, summarize, type Status } from '@/lib/dataremoval/core'

type Row = { status: Status; updated_at: string }
const TONE: Record<Status, string> = {
  not_listed: 'bg-zinc-200 text-black', requested: 'bg-amber-400 text-black', removed: 'bg-emerald-400 text-black', reappeared: 'bg-rose-500 text-white',
}
const fmt = (d: string) => new Date(d + (d.length === 10 ? 'T12:00:00Z' : '')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export function Tracker({ demo, email, initialName, initialStatuses }: { demo: boolean; email: string; initialName: string; initialStatuses: Record<string, Row> }) {
  const [name, setName] = useState(initialName)
  const [draft, setDraft] = useState(initialName)
  const [statuses, setStatuses] = useState(initialStatuses)
  const [msg, setMsg] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const sum = useMemo(() => summarize(Object.fromEntries(Object.entries(statuses).map(([k, v]) => [k, v.status]))), [statuses])
  const pct = sum.total ? Math.round((sum.done / sum.total) * 100) : 0

  async function saveName() {
    const n = cleanName(draft)
    if (!n) return setMsg('Enter your name (up to 100 characters).')
    setMsg('')
    if (!demo) {
      const db = createClient() as any
      const uid = (await db.auth.getUser()).data.user?.id
      const { error } = await db.from('dr_profiles').upsert({ user_id: uid, full_name: n, updated_at: new Date().toISOString() })
      if (error) return setMsg('Could not save. Check that Data Removal is still on your plan.')
    }
    setName(n)
  }
  async function setStatus(brokerId: string, status: Status) {
    const prev = statuses
    const now = new Date().toISOString()
    setStatuses({ ...statuses, [brokerId]: { status, updated_at: now } })
    if (demo) return
    const db = createClient() as any
    const uid = (await db.auth.getUser()).data.user?.id
    const { error } = await db.from('dr_status').upsert({ user_id: uid, broker_id: brokerId, status, updated_at: now })
    if (error) { setStatuses(prev); setMsg('Could not save that status. Check that Data Removal is still on your plan.') }
  }
  function downloadIcs() {
    const blob = new Blob([buildRecheckIcs(new Date())], { type: 'text/calendar' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'recheck-data-brokers.ics'; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  return (
    <div className="space-y-6">
      {demo && <p role="note" className="rounded-xl bg-violet-600/20 px-4 py-2 text-center text-sm text-violet-100 ring-1 ring-violet-400/40">Demo account: nothing you enter here is saved.</p>}
      <section className="cine-hero relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-950 via-[#0f0f1a] to-black p-6 sm:p-8">
        <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-600/30 blur-3xl" />
        <p className="relative text-xs font-bold uppercase tracking-[.25em] text-indigo-300">Your opt-out checklist</p>
        {name ? (
          <>
            <h1 className="cine-title relative mt-2 text-3xl sm:text-4xl">{name}</h1>
            <button onClick={() => { setDraft(name); setName('') }} className="relative mt-1 text-xs text-zinc-400 underline">Change name</button>
            <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[['Done', sum.done, 'text-emerald-300'], ['Requested', sum.requested, 'text-amber-300'], ['To check', sum.untouched, 'text-zinc-200'], ['Reappeared', sum.reappeared, 'text-rose-300']].map(([l, v, c]) => (
                <div key={l as string} className="rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/10"><div className={`text-2xl font-black ${c}`}>{v as number}</div><div className="text-xs text-zinc-400">{l}</div></div>
              ))}
            </div>
            <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-white/10" aria-label={`${pct}% done`}><div className="h-full bg-gradient-to-r from-indigo-400 to-emerald-400" style={{ width: `${pct}%` }} /></div>
            <p className="relative mt-1 text-xs text-zinc-400">{sum.done} of {sum.total} sites done (not listed or removed)</p>
          </>
        ) : (
          <div className="relative mt-3 max-w-md">
            <h1 className="cine-title text-3xl sm:text-4xl">Start with your name</h1>
            <p className="mt-2 text-sm text-zinc-300">Enter it once, the way it appears on these sites. It&apos;s the only personal detail we store.</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input aria-label="Your full name" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Full name" className="flex-1 rounded-full border border-white/20 bg-black/50 px-4 py-3 text-white placeholder:text-zinc-500" />
              <button onClick={saveName} className="rounded-full bg-white px-6 py-3 font-semibold text-black hover:bg-zinc-200">Start checklist</button>
            </div>
          </div>
        )}
        {msg && <p className="relative mt-3 text-sm text-rose-300">{msg}</p>}
      </section>

      {name && (<>
        <section className="cine-glass flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center">
          <div className="flex-1"><h2 className="font-bold">Re-check every 60 days</h2><p className="text-sm text-zinc-400">Listings often come back. Set a reminder; we don&apos;t send it, your calendar or mail app does.</p></div>
          <button onClick={downloadIcs} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"><CalendarPlus className="h-4 w-4" />Add to calendar (.ics)</button>
          <a href={buildRecheckMailto(email, new Date())} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-4 py-2 text-sm font-semibold"><Mail className="h-4 w-4" />Email myself</a>
        </section>

        <ul className="grid gap-3 sm:grid-cols-2">
          {VISIBLE_BROKERS.map((b) => {
            const cur = statuses[b.id]
            return (
              <li key={b.id} data-broker={b.id} className="cine-card cine-glass flex flex-col rounded-2xl p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-bold">{b.name}</h3>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-400">
                      <span className="inline-flex items-center gap-1 text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" />Link checked {b.lastChecked && fmt(b.lastChecked)}</span>
                      <span>· Removal: {b.typicalRemovalTime ?? 'varies by site'}</span>
                    </p>
                  </div>
                  {cur && <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${TONE[cur.status]}`}>{STATUS_LABEL[cur.status]}</span>}
                </div>
                <a href={b.optOutUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 self-start rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Open opt-out page<ExternalLink className="h-3.5 w-3.5" /></a>
                <button onClick={() => setOpen(open === b.id ? null : b.id)} className="mt-2 self-start text-xs text-zinc-400 underline">{open === b.id ? 'Hide steps' : 'Show steps'}</button>
                {open === b.id && (
                  <div className="mt-2 rounded-xl bg-black/40 p-3 text-sm">
                    <p className="text-xs font-semibold text-zinc-400">General steps, the site may differ.</p>
                    <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-zinc-200">{b.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                  </div>
                )}
                <div role="group" aria-label={`Status for ${b.name}`} className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {STATUSES.map((s) => (
                    <button key={s} aria-pressed={cur?.status === s} onClick={() => setStatus(b.id, s)}
                      className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${cur?.status === s ? TONE[s] : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}>{STATUS_LABEL[s]}</button>
                  ))}
                </div>
                {cur && <p className="mt-2 text-[11px] text-zinc-500">Updated {fmt(cur.updated_at)}</p>}
              </li>
            )
          })}
        </ul>
      </>)}
    </div>
  )
}
