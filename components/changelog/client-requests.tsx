'use client'
import { useState } from 'react'
import { estLabel } from '@/lib/changelog/core'
import type { PublicReq } from '@/lib/changelog/public'

const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
export function ClientRequests({ token, initial, currency, rate, demo }: { token: string; initial: PublicReq[]; currency: string; rate: number | null; demo: boolean }) {
  const [reqs, setReqs] = useState(initial)
  const [open, setOpen] = useState<{ id: string; decision: 'approved' | 'declined' } | null>(null)
  const [name, setName] = useState(''), [note, setNote] = useState('')
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  async function send() {
    if (!open) return
    setErr('')
    if (!name.trim()) return setErr('Please add your name.')
    setBusy(true)
    const r = await fetch('/api/changelog/public/decide', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, request_id: open.id, decision: open.decision, name, note }) })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) return setErr(d.error || 'Couldn’t save that. Please try again.')
    setReqs((rs) => rs.map((x) => (x.id === open.id ? { ...x, status: open.decision, decided_name: name.trim(), decided_note: note.trim() || null, decided_at: new Date().toISOString() } : x)))
    setOpen(null); setNote('')
  }
  const pending = reqs.filter((r) => r.status === 'pending')
  const done = reqs.filter((r) => r.status !== 'pending')
  const item = (r: PublicReq) => (
    <li key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1"><div className="font-semibold">{r.title}</div>{r.description && <p className="mt-1 whitespace-pre-line text-sm text-zinc-400">{r.description}</p>}<div className="mt-1 text-xs text-zinc-500">Asked {fmt(r.created_at)}</div></div>
        <div className="text-right font-bold tabular-nums">{estLabel(r, currency, rate)}</div>
      </div>
      {r.status === 'pending' ? (
        open?.id === r.id ? (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-zinc-300">{open.decision === 'approved' ? 'Add this to the project.' : 'Skip this one.'}</p>
            <input className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-base" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus />
            <textarea className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-base" rows={2} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
            {err && <p role="alert" className="text-sm text-amber-200">{err}</p>}
            <div className="flex gap-2"><button disabled={busy} onClick={send} className={`flex-1 rounded-full px-4 py-3 font-bold text-black ${open.decision === 'approved' ? 'bg-emerald-400' : 'bg-zinc-200'}`}>{busy ? 'Saving…' : open.decision === 'approved' ? 'Approved' : 'No thanks'}</button><button onClick={() => { setOpen(null); setErr('') }} className="rounded-full border border-white/20 px-4 py-3 text-sm">Cancel</button></div>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setOpen({ id: r.id, decision: 'approved' })} className="rounded-full bg-emerald-400 px-4 py-3 font-bold text-black hover:brightness-110">OK, add it</button>
            <button onClick={() => setOpen({ id: r.id, decision: 'declined' })} className="rounded-full border border-white/20 px-4 py-3 font-semibold hover:bg-white/10">No thanks</button>
          </div>
        )
      ) : (
        <p className={`mt-3 text-sm ${r.status === 'approved' ? 'text-emerald-300' : 'text-zinc-400'}`}>{r.status === 'approved' ? '✓ Approved' : 'Declined'} by {r.decided_name}{r.decided_at ? ` · ${fmt(r.decided_at)}` : ''}{r.decided_note ? ` · “${r.decided_note}”` : ''}{r.invoiced ? ' · invoiced' : ''}</p>
      )}
    </li>
  )
  return (
    <>
      {demo && <p className="mb-3 text-sm text-purple-200">Demo: try the buttons. Nothing is saved.</p>}
      {pending.length > 0 && <section className="mb-8"><h2 className="mb-3 text-lg font-bold">Waiting for your OK <span className="text-zinc-500">({pending.length})</span></h2><ul className="space-y-3">{pending.map(item)}</ul></section>}
      {done.length > 0 && <section><h2 className="mb-3 text-lg font-bold">Answered</h2><ul className="space-y-3">{done.map(item)}</ul></section>}
      {!reqs.length && <p className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-zinc-300">No requests yet.</p>}
    </>
  )
}
