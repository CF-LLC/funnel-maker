// Booking: pure logic (slot generation, validation, .ics). No Next/Supabase imports, so it is unit-tested directly.
import { z } from 'zod'

export type Window = { weekday: number; start_min: number; end_min: number }
export type MeetingType = { duration_min: number; buffer_before: number; buffer_after: number; min_notice_min: number; max_days_ahead: number }
export type Block = { block_start: string | Date; block_end: string | Date }
export type Slot = { start: string; end: string }

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz || tz.length > 64) return false
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true } catch { return false }
}

export const windowSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  start_min: z.number().int().min(0).max(1439),
  end_min: z.number().int().min(1).max(1440),
}).refine((w) => w.end_min > w.start_min, { message: 'End time must be after start time' })
export const weeklySchema = z.array(windowSchema).max(50)

export const typeSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{0,59}$/, 'Use lowercase letters, numbers and dashes'),
  description: z.string().trim().max(500).optional().nullable(),
  duration_min: z.coerce.number().int().min(5).max(480),
  buffer_before: z.coerce.number().int().min(0).max(240).default(0),
  buffer_after: z.coerce.number().int().min(0).max(240).default(0),
  min_notice_min: z.coerce.number().int().min(0).max(43200).default(240),
  max_days_ahead: z.coerce.number().int().min(1).max(365).default(30),
  location: z.string().trim().max(300).optional().nullable(),
})

export const bookSchema = z.object({
  handle: z.string().trim().min(1).max(40),
  type: z.string().trim().min(1).max(60),
  start: z.string().datetime(),
  name: z.string().trim().min(1, 'Please enter your name').max(100),
  email: z.string().trim().email('Please enter a valid email').max(254),
  notes: z.string().trim().max(1000).optional(),
  tz: z.string().max(64).optional(),
  turnstileToken: z.string().max(4096).optional(),
})

/** Offset (ms) of tz from UTC at instant t. */
function tzOffset(t: number, tz: string): number {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(new Date(t)).reduce<Record<string, number>>((a, x) => (x.type !== 'literal' && (a[x.type] = Number(x.value)), a), {})
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(t / 1000) * 1000
}

/** UTC instant for a wall-clock time (minutes after local midnight) on local date y-m-d in tz. */
export function zonedTime(y: number, m: number, d: number, minutes: number, tz: string): number {
  const guess = Date.UTC(y, m - 1, d, 0, minutes)
  let t = guess - tzOffset(guess, tz)
  const o2 = tzOffset(t, tz)
  t = guess - o2
  return t
}

/** Local calendar date (y, m, d) of instant t in tz. */
export function localDate(t: number, tz: string): { y: number; m: number; d: number } {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t)).split('-').map(Number)
  return { y, m, d }
}

const MIN = 60_000
const ms = (v: string | Date) => (typeof v === 'string' ? Date.parse(v) : v.getTime())

/** Open slots for a meeting type. Slots start every min(duration, 30) minutes inside each availability window;
 * a slot is open when it respects minimum notice and its buffered range doesn't overlap an existing block. */
export function generateSlots(opts: { tz: string; weekly: Window[]; type: MeetingType; blocks: Block[]; now?: number; days?: number }): Slot[] {
  const { tz, weekly, type } = opts
  const now = opts.now ?? Date.now()
  const days = Math.min(opts.days ?? type.max_days_ahead, type.max_days_ahead)
  const step = Math.min(type.duration_min, 30)
  const earliest = now + type.min_notice_min * MIN
  const latest = now + type.max_days_ahead * 24 * 60 * MIN
  const blocks = opts.blocks.map((b) => [ms(b.block_start), ms(b.block_end)] as const)
  const out: Slot[] = []
  const seen = new Set<number>()
  const start = localDate(now, tz)
  for (let i = 0; i <= days; i++) {
    const day = new Date(Date.UTC(start.y, start.m - 1, start.d + i))
    const y = day.getUTCFullYear(), m = day.getUTCMonth() + 1, d = day.getUTCDate(), wd = day.getUTCDay()
    for (const w of weekly.filter((x) => x.weekday === wd).sort((a, b) => a.start_min - b.start_min)) {
      for (let s = w.start_min; s + type.duration_min <= w.end_min; s += step) {
        const st = zonedTime(y, m, d, s, tz)
        if (st < earliest || st > latest || seen.has(st)) continue
        const en = st + type.duration_min * MIN
        const bs = st - type.buffer_before * MIN, be = en + type.buffer_after * MIN
        if (blocks.some(([a, b]) => bs < b && a < be)) continue
        seen.add(st)
        out.push({ start: new Date(st).toISOString(), end: new Date(en).toISOString() })
      }
    }
  }
  return out.sort((a, b) => (a.start < b.start ? -1 : 1))
}

/** Buffered range stored on a booking (used by the database exclusion constraint). */
export function blockFor(startIso: string, type: MeetingType) {
  const st = Date.parse(startIso)
  return {
    starts_at: new Date(st).toISOString(), ends_at: new Date(st + type.duration_min * MIN).toISOString(),
    block_start: new Date(st - type.buffer_before * MIN).toISOString(), block_end: new Date(st + (type.duration_min + type.buffer_after) * MIN).toISOString(),
  }
}

/** True when two confirmed bookings would collide (mirrors bk_no_double_booking). */
export function overlaps(a: Block, b: Block): boolean {
  return ms(a.block_start) < ms(b.block_end) && ms(b.block_start) < ms(a.block_end)
}

const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[,;]/g, (c) => '\\' + c)
const icsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

export function buildIcs(e: { uid: string; start: string; end: string; title: string; description?: string; location?: string | null; now?: string }): string {
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SaaS Nation//Booking//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:${e.uid}@saasnation.site`, `DTSTAMP:${icsDate(e.now ?? new Date().toISOString())}`,
    `DTSTART:${icsDate(e.start)}`, `DTEND:${icsDate(e.end)}`, `SUMMARY:${icsText(e.title)}`,
    ...(e.description ? [`DESCRIPTION:${icsText(e.description)}`] : []), ...(e.location ? [`LOCATION:${icsText(e.location)}`] : []),
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n')
}

export const minToLabel = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
export function labelToMin(s: string): number | null {
  const r = /^(\d{1,2}):(\d{2})$/.exec(s.trim()); if (!r) return null
  const v = Number(r[1]) * 60 + Number(r[2]); return Number(r[1]) <= 24 && Number(r[2]) < 60 && v <= 1440 ? v : null
}
export const bookPath = (handle: string, type?: string) => `/@${handle}/book${type ? `/${type}` : ''}`
