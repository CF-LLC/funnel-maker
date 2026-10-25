'use client'
import { useMemo, useState } from 'react'
import { Turnstile } from '@/components/turnstile'
import { buildIcs, type Slot } from '@/lib/booking/core'

type Props = { handle: string; type: string; typeName: string; ownerName: string; location: string | null; slots: Slot[]; demo: boolean }

export function SlotPicker({ handle, type, typeName, ownerName, location, slots, demo }: Props) {
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', [])
  const days = useMemo(() => {
    const m = new Map<string, Slot[]>()
    for (const s of slots) {
      const k = new Date(s.start).toLocaleDateString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' })
      m.set(k, [...(m.get(k) || []), s])
    }
    return [...m.entries()]
  }, [slots, tz])
  const [day, setDay] = useState(0)
  const [pick, setPick] = useState<Slot | null>(null)
  const [token, setToken] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle')
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ id: string; start: string; end: string; demo: boolean } | null>(null)
  const time = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })
  const full = (iso: string) => new Date(iso).toLocaleString('en-US', { timeZone: tz, dateStyle: 'full', timeStyle: 'short' })

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!pick) return
    const f = new FormData(e.currentTarget)
    setState('sending'); setError('')
    const res = await fetch('/api/booking/book', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle, type, start: pick.start, name: f.get('name'), email: f.get('email'), notes: f.get('notes') || undefined, turnstileToken: token }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setError(data.error || 'Something went wrong'); setState('error'); return }
    setDone({ id: data.id, start: data.starts_at, end: data.ends_at, demo: !!data.demo })
  }

  if (done) {
    const ics = buildIcs({ uid: done.id === 'demo' ? `demo-${done.start}` : done.id, start: done.start, end: done.end, title: `${typeName} with ${ownerName}`, location })
    return (
      <div role="status" className="space-y-3 rounded-xl border p-4">
        <p className="text-lg font-semibold">{done.demo ? 'This is a demo, nothing was booked.' : 'You’re booked!'}</p>
        <p>{typeName} with {ownerName}<br />{full(done.start)} <span className="text-xs text-muted-foreground">({tz})</span></p>
        <a href={`data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`} download="booking.ics" className="inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Add to calendar (.ics)</a>
        {!done.demo && <p className="text-xs text-muted-foreground">Email confirmations are not switched on yet, so please save this to your calendar now.</p>}
      </div>
    )
  }

  if (days.length === 0) return <p className="text-muted-foreground">No open times right now. Please check back later.</p>
  const current = days[Math.min(day, days.length - 1)]
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Times shown in your time zone: {tz}</p>
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Day">
        {days.map(([label], i) => (
          <button key={label} role="tab" aria-selected={i === day} onClick={() => { setDay(i); setPick(null) }}
            className={`shrink-0 rounded-lg border px-3 py-2 text-sm ${i === day ? 'bg-foreground text-background' : ''}`}>{label}</button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {current[1].map((s) => (
          <button key={s.start} onClick={() => setPick(s)} data-slot={s.start}
            className={`rounded-lg border px-2 py-2 text-sm ${pick?.start === s.start ? 'border-foreground bg-foreground text-background' : 'hover:border-foreground'}`}>{time(s.start)}</button>
        ))}
      </div>
      {pick && (
        <form onSubmit={submit} className="space-y-3 rounded-xl border p-4">
          <p className="text-sm font-medium">{full(pick.start)}</p>
          <input name="name" required maxLength={100} placeholder="Your name" className="w-full rounded-lg border px-3 py-2" />
          <input name="email" type="email" required maxLength={254} placeholder="you@example.com" className="w-full rounded-lg border px-3 py-2" />
          <textarea name="notes" maxLength={1000} placeholder="Anything to share before the call? (optional)" className="w-full rounded-lg border px-3 py-2" rows={3} />
          {!demo && <Turnstile onToken={setToken} />}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={state === 'sending'} className="w-full rounded-lg bg-brand px-4 py-2 font-semibold text-white disabled:opacity-60">{state === 'sending' ? 'Booking…' : 'Confirm booking'}</button>
          {demo && <p className="text-xs text-muted-foreground">This is a demo. Nothing is stored.</p>}
        </form>
      )}
    </div>
  )
}
