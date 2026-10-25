'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { isValidTimeZone, labelToMin, minToLabel, typeSchema, WEEKDAYS, weeklySchema, type Window } from '@/lib/booking/core'

const box = 'rounded-xl border bg-background p-4 space-y-3'
const input = 'rounded-lg border px-3 py-2 text-sm'
const btn = 'rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60'
const PLAN_ERR = 'Could not save. Check that Booking is still on your plan.'

export function BookingSettings({ initial, exists, weekly, weeklyExists }: { initial: { timezone: string; published: boolean }; exists: boolean; weekly: Window[]; weeklyExists: boolean }) {
  const router = useRouter()
  const [tz, setTz] = useState(initial.timezone)
  const [published, setPublished] = useState(initial.published)
  const [rows, setRows] = useState(() => WEEKDAYS.map((_, d) => {
    const w = weekly.find((x) => x.weekday === d)
    return { on: !!w, start: minToLabel(w?.start_min ?? 540), end: minToLabel(w?.end_min ?? 1020) }
  }))
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  async function save() {
    setMsg('')
    if (!isValidTimeZone(tz)) return setMsg('Unknown time zone. Use a name like America/Chicago.')
    const win: Window[] = []
    for (const [d, r] of rows.entries()) {
      if (!r.on) continue
      const s = labelToMin(r.start), e = labelToMin(r.end)
      if (s === null || e === null || e <= s) return setMsg(`${WEEKDAYS[d]}: end time must be after start time (HH:MM).`)
      win.push({ weekday: d, start_min: s, end_min: e })
    }
    if (!weeklySchema.safeParse(win).success) return setMsg('Check your hours.')
    setBusy(true)
    const db = createClient() as any
    const s1 = exists ? await db.from('bk_settings').update({ timezone: tz, published, updated_at: new Date().toISOString() }).eq('user_id', (await db.auth.getUser()).data.user.id)
      : await db.from('bk_settings').insert({ timezone: tz, published })
    const s2 = weeklyExists ? await db.from('bk_availability').update({ weekly: win, updated_at: new Date().toISOString() }).eq('user_id', (await db.auth.getUser()).data.user.id)
      : await db.from('bk_availability').insert({ weekly: win })
    setBusy(false)
    if (s1.error || s2.error) return setMsg(PLAN_ERR)
    setMsg('Saved.'); router.refresh()
  }
  return (
    <section className={box}>
      <h2 className="font-semibold">Availability</h2>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">Time zone <input aria-label="Time zone" value={tz} onChange={(e) => setTz(e.target.value.trim())} className={`${input} ml-2 w-56`} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Booking page is live</label>
      </div>
      <div className="space-y-2">
        {rows.map((r, d) => (
          <div key={d} className="flex flex-wrap items-center gap-2 text-sm">
            <label className="flex w-32 items-center gap-2"><input type="checkbox" checked={r.on} onChange={(e) => setRows(rows.map((x, i) => (i === d ? { ...x, on: e.target.checked } : x)))} />{WEEKDAYS[d]}</label>
            {r.on ? (<>
              <input type="time" aria-label={`${WEEKDAYS[d]} start`} value={r.start} onChange={(e) => setRows(rows.map((x, i) => (i === d ? { ...x, start: e.target.value } : x)))} className={input} />
              <span>to</span>
              <input type="time" aria-label={`${WEEKDAYS[d]} end`} value={r.end} onChange={(e) => setRows(rows.map((x, i) => (i === d ? { ...x, end: e.target.value } : x)))} className={input} />
            </>) : <span className="text-muted-foreground">Unavailable</span>}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3"><button onClick={save} disabled={busy} className={btn}>Save availability</button>{msg && <span role="status" className="text-sm">{msg}</span>}</div>
    </section>
  )
}

type TypeRow = { id: string; slug: string; name: string; description: string | null; duration_min: number; buffer_before: number; buffer_after: number; min_notice_min: number; max_days_ahead: number; location: string | null; active: boolean }

export function TypesManager({ types }: { types: TypeRow[] }) {
  const router = useRouter()
  const [msg, setMsg] = useState('')
  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMsg('')
    const f = Object.fromEntries(new FormData(e.currentTarget).entries())
    const v = typeSchema.safeParse({ ...f, min_notice_min: Number(f.min_notice_hours || 0) * 60 })
    if (!v.success) return setMsg(v.error.issues[0]?.message || 'Check the fields')
    const { error } = await (createClient() as any).from('bk_types').insert(v.data)
    if (error) return setMsg(error.code === '23505' ? 'That link name is already used.' : PLAN_ERR)
    e.currentTarget?.reset(); router.refresh()
  }
  async function toggle(t: TypeRow) {
    const { error } = await (createClient() as any).from('bk_types').update({ active: !t.active }).eq('id', t.id)
    if (error) return setMsg(PLAN_ERR)
    router.refresh()
  }
  return (
    <section className={box}>
      <h2 className="font-semibold">Meeting types</h2>
      <ul className="divide-y">
        {types.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
            <span className="font-medium">{t.name}</span>
            <span className="text-muted-foreground">{t.duration_min} min · buffers {t.buffer_before}/{t.buffer_after} min · /{t.slug}</span>
            <button onClick={() => toggle(t)} className="ml-auto rounded-full border px-3 py-1 text-xs">{t.active ? 'Turn off' : 'Turn on'}</button>
          </li>
        ))}
        {types.length === 0 && <li className="py-2 text-sm text-muted-foreground">No meeting types yet.</li>}
      </ul>
      <form onSubmit={add} className="grid gap-2 sm:grid-cols-2">
        <input name="name" required placeholder="Name, e.g. Free strategy call" className={input} />
        <input name="slug" required placeholder="Link name, e.g. strategy-call" className={input} />
        <label className="text-xs">Duration (min)<input name="duration_min" type="number" min={5} max={480} defaultValue={30} className={`${input} w-full`} /></label>
        <label className="text-xs">Minimum notice (hours)<input name="min_notice_hours" type="number" min={0} max={720} defaultValue={4} className={`${input} w-full`} /></label>
        <label className="text-xs">Buffer before (min)<input name="buffer_before" type="number" min={0} max={240} defaultValue={0} className={`${input} w-full`} /></label>
        <label className="text-xs">Buffer after (min)<input name="buffer_after" type="number" min={0} max={240} defaultValue={10} className={`${input} w-full`} /></label>
        <label className="text-xs">Book up to (days ahead)<input name="max_days_ahead" type="number" min={1} max={365} defaultValue={30} className={`${input} w-full`} /></label>
        <input name="location" placeholder="Location or video link (optional)" className={input} />
        <textarea name="description" placeholder="Description (optional)" className={`${input} sm:col-span-2`} rows={2} />
        <div className="flex items-center gap-3 sm:col-span-2"><button className={btn}>Add meeting type</button>{msg && <span role="status" className="text-sm">{msg}</span>}</div>
      </form>
    </section>
  )
}

type BookingRow = { id: string; type_id: string; starts_at: string; ends_at: string; name: string; email: string; notes: string | null; status: 'confirmed' | 'cancelled' }

export function BookingsList({ bookings, types, timezone }: { bookings: BookingRow[]; types: TypeRow[]; timezone: string }) {
  const router = useRouter()
  const [msg, setMsg] = useState('')
  const now = Date.now()
  const upcoming = bookings.filter((b) => Date.parse(b.ends_at) >= now)
  const past = bookings.filter((b) => Date.parse(b.ends_at) < now).reverse()
  const when = (iso: string) => new Date(iso).toLocaleString('en-US', { timeZone: timezone, dateStyle: 'medium', timeStyle: 'short' })
  async function cancel(b: BookingRow) {
    if (!confirm(`Cancel the booking with ${b.name}? They are not emailed automatically, so let them know.`)) return
    const { error } = await (createClient() as any).from('bk_bookings').update({ status: 'cancelled' }).eq('id', b.id)
    if (error) return setMsg('Could not cancel the booking.')
    router.refresh()
  }
  const row = (b: BookingRow) => (
    <li key={b.id} className="flex flex-wrap items-center gap-2 py-2 text-sm" data-booking={b.status}>
      <span className="font-medium">{when(b.starts_at)}</span>
      <span>{types.find((t) => t.id === b.type_id)?.name || 'Meeting'}</span>
      <span className="text-muted-foreground">{b.name} · <a className="hover:underline" href={`mailto:${b.email}`}>{b.email}</a></span>
      {b.status === 'cancelled' ? <span className="ml-auto rounded-full bg-muted px-2 text-xs">Cancelled</span>
        : Date.parse(b.ends_at) >= now && <button onClick={() => cancel(b)} className="ml-auto rounded-full border px-3 py-1 text-xs">Cancel</button>}
      {b.notes && <p className="w-full whitespace-pre-line text-xs text-muted-foreground">{b.notes}</p>}
    </li>
  )
  return (
    <section className={box}>
      <h2 className="font-semibold">Bookings</h2>
      {msg && <p role="alert" className="text-sm text-red-600">{msg}</p>}
      <h3 className="text-sm font-medium">Upcoming</h3>
      <ul className="divide-y">{upcoming.length ? upcoming.map(row) : <li className="py-2 text-sm text-muted-foreground">No upcoming bookings.</li>}</ul>
      {past.length > 0 && (<><h3 className="text-sm font-medium">Past 30 days</h3><ul className="divide-y">{past.map(row)}</ul></>)}
    </section>
  )
}
