'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarPlus, Check, ChevronLeft, Globe, Mail } from 'lucide-react'
import { Turnstile } from '@/components/turnstile'
import { buildIcs, type Slot } from '@/lib/booking/core'

type Props = { handle: string; type: string; typeName: string; ownerName: string; location: string | null; slots: Slot[]; demo: boolean; emailOn?: boolean }

export function SlotPicker({ handle, type, typeName, ownerName, location, slots, demo, emailOn = false }: Props) {
  const [tz, setTz] = useState('UTC')
  useEffect(() => { setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC') }, [])
  const days = useMemo(() => {
    const m = new Map<string, { wd: string; day: string; mon: string; long: string; slots: Slot[] }>()
    for (const s of slots) {
      const d = new Date(s.start)
      const k = d.toLocaleDateString('en-CA', { timeZone: tz })
      const e = m.get(k) || { wd: d.toLocaleDateString('en-US', { timeZone: tz, weekday: 'short' }), day: d.toLocaleDateString('en-US', { timeZone: tz, day: 'numeric' }), mon: d.toLocaleDateString('en-US', { timeZone: tz, month: 'short' }), long: d.toLocaleDateString('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric' }), slots: [] }
      e.slots.push(s); m.set(k, e)
    }
    return [...m.values()]
  }, [slots, tz])
  const [day, setDay] = useState(0)
  const [pick, setPick] = useState<Slot | null>(null)
  const [token, setToken] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ id: string; start: string; end: string; demo: boolean; emailed: boolean; email: string } | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const time = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })
  const longDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric' })
  useEffect(() => { if (pick) formRef.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' }) }, [pick])

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!pick) return
    const f = new FormData(e.currentTarget)
    setSending(true); setError('')
    const email = String(f.get('email') || '')
    const res = await fetch('/api/booking/book', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle, type, start: pick.start, name: f.get('name'), email, notes: f.get('notes') || undefined, tz, turnstileToken: token }),
    })
    const data = await res.json().catch(() => ({}))
    setSending(false)
    if (!res.ok) { setError(data.error || 'Something went wrong'); return }
    setDone({ id: data.id, start: data.starts_at, end: data.ends_at, demo: !!data.demo, emailed: !!data.emailed, email })
  }

  if (done) {
    const ics = buildIcs({ uid: done.id === 'demo' ? `demo-${done.start}` : done.id, start: done.start, end: done.end, title: `${typeName} with ${ownerName}`, location })
    return (
      <div role="status" className="mx-auto max-w-lg py-4 text-center">
        <div className="cine-pop mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-[0_20px_50px_-15px_rgba(192,38,211,.9)]">
          <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="cine-check" d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </div>
        <h2 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">{done.demo ? 'Demo booking' : 'You’re booked.'}</h2>
        {done.demo && <p className="mt-2 text-zinc-300">This is a demo, nothing was booked or sent.</p>}
        <div className="cine-ticket mt-6 rounded-2xl p-5 text-left">
          <div className="text-xs font-bold uppercase tracking-[.2em] text-violet-300">{longDay(done.start)}</div>
          <div className="mt-1 text-4xl font-black">{time(done.start)} <span className="text-base font-semibold text-zinc-400">– {time(done.end)}</span></div>
          <div className="mt-2 text-sm text-zinc-300">{typeName} with {ownerName}{location ? ` · ${location}` : ''}</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500"><Globe className="h-3.5 w-3.5" />{tz}</div>
        </div>
        <a href={`data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`} download="booking.ics" className="cine-cta mt-5 inline-flex items-center gap-2 px-6 py-3.5"><CalendarPlus className="h-5 w-5" />Add to calendar</a>
        {!done.demo && (
          <p className="mt-5 flex items-start justify-center gap-2 text-sm text-zinc-400">
            <Mail className="mt-0.5 h-4 w-4 shrink-0" />
            {done.emailed ? <span>A confirmation with a calendar invite is on its way to <span className="text-zinc-200">{done.email}</span>.</span>
              : emailOn ? <span>Your confirmation email should arrive shortly. Save the calendar file just in case.</span>
              : <span>Email confirmations aren&apos;t switched on yet, so save this to your calendar now.</span>}
          </p>
        )}
      </div>
    )
  }

  if (days.length === 0) return <p className="py-8 text-center text-zinc-300">No open times right now. Please check back soon.</p>
  const current = days[Math.min(day, days.length - 1)]
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)] lg:gap-10">
      <div className={`min-w-0 ${pick ? 'hidden lg:block' : ''}`}>
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xl font-extrabold sm:text-2xl">Choose a time</h2>
          <span className="flex items-center gap-1.5 text-xs text-zinc-400"><Globe className="h-3.5 w-3.5" />{tz}</span>
        </div>
        <div className="nf-scroller -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-2" role="tablist" aria-label="Day">
          {days.map((d, i) => (
            <button key={d.long} role="tab" aria-selected={i === day} aria-label={d.long} onClick={() => { setDay(i); setPick(null) }}
              className="slot-day flex w-[4.25rem] shrink-0 flex-col items-center rounded-2xl border border-white/10 bg-white/[.04] py-3 hover:border-white/40">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">{d.wd}</span>
              <span className="text-2xl font-black leading-tight">{d.day}</span>
              <span className="text-[11px] opacity-70">{d.mon}</span>
            </button>
          ))}
        </div>
        <p className="mt-5 text-sm font-semibold text-zinc-300">{current.long}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {current.slots.map((s) => (
            <button key={s.start} onClick={() => setPick(s)} data-slot={s.start} aria-pressed={pick?.start === s.start}
              className="slot-time rounded-xl border border-white/12 bg-white/[.03] px-2 py-3 text-sm font-bold">{time(s.start)}</button>
          ))}
        </div>
      </div>
      <div className={`min-w-0 ${pick ? '' : 'hidden lg:block'}`}>
        {pick ? (
          <form ref={formRef} onSubmit={submit} className="cine-rise space-y-3">
            <button type="button" onClick={() => setPick(null)} className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white lg:hidden"><ChevronLeft className="h-4 w-4" />Change time</button>
            <div className="cine-ticket rounded-2xl p-4">
              <div className="text-xs font-bold uppercase tracking-[.2em] text-violet-300">{longDay(pick.start)}</div>
              <div className="mt-1 text-3xl font-black">{time(pick.start)}</div>
              <div className="text-sm text-zinc-400">{typeName}</div>
            </div>
            <label className="block text-sm font-semibold text-zinc-300">Your name<input name="name" required maxLength={100} autoComplete="name" className="cine-input mt-1.5" /></label>
            <label className="block text-sm font-semibold text-zinc-300">Email<input name="email" type="email" required maxLength={254} autoComplete="email" className="cine-input mt-1.5" /></label>
            <label className="block text-sm font-semibold text-zinc-300">Anything to share? <span className="font-normal text-zinc-500">(optional)</span><textarea name="notes" maxLength={1000} className="cine-input mt-1.5" rows={3} /></label>
            {!demo && <Turnstile onToken={setToken} />}
            {error && <p role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
            <button type="submit" disabled={sending} className="cine-cta flex w-full items-center justify-center gap-2 px-4 py-4 text-base disabled:opacity-60"><Check className="h-5 w-5" />{sending ? 'Booking…' : 'Confirm booking'}</button>
            <p className="text-center text-xs text-zinc-500">{demo ? 'This is a demo. Nothing is stored or sent.' : emailOn ? 'You’ll get a confirmation email with a calendar invite.' : 'You’ll get an on-screen confirmation and a calendar file.'}</p>
          </form>
        ) : (
          <div className="grid h-full min-h-48 place-items-center rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-zinc-400">Pick a time to continue.</div>
        )}
      </div>
    </div>
  )
}
