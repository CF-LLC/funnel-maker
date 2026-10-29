'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Task } from '@/lib/portal/core'

export function ClientChecklist({ token, initial }: { token: string; initial: Task[] }) {
  const router = useRouter()
  const [tasks, setTasks] = useState(initial)
  const [err, setErr] = useState('')
  async function tick(t: Task) {
    if (t.who !== 'client') return
    const done = !t.done_at
    setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, done_at: done ? new Date().toISOString() : null } : x)))
    const r = await fetch('/api/portal/public/tick', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, task_id: t.id, done }) })
    if (!r.ok) { setErr('Couldn’t save that. Please try again.'); setTasks((ts) => ts.map((x) => (x.id === t.id ? t : x))) } else { setErr(''); router.refresh() }
  }
  return (
    <>
      <ul className="space-y-2">{tasks.map((t) => {
        const mine = t.who === 'client'
        return (
          <li key={t.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <button onClick={() => tick(t)} disabled={!mine} aria-label={mine ? (t.done_at ? 'Mark not done' : 'Mark done') : 'Your coach ticks this'} className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition ${t.done_at ? 'border-sky-400 bg-sky-400 text-black' : mine ? 'border-white/40 hover:border-sky-300' : 'border-dashed border-white/20'}`}>{t.done_at ? '✓' : ''}</button>
            <div className="min-w-0 flex-1">
              <div className={`font-medium ${t.done_at ? 'text-zinc-500 line-through' : ''}`}>{t.title}</div>
              {t.note && <div className="mt-0.5 text-sm text-zinc-400">{t.note}</div>}
              {t.link && <a href={t.link} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 inline-block text-sm text-sky-300 underline">Open link →</a>}
              {!mine && <div className="mt-1 text-[11px] uppercase tracking-wider text-zinc-500">{t.done_at ? 'Done by your coach' : 'Your coach will tick this'}</div>}
            </div>
          </li>
        )
      })}</ul>
      {err && <p role="alert" className="mt-2 text-sm text-amber-200">{err}</p>}
    </>
  )
}
