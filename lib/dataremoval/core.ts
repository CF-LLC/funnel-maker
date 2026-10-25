import { BROKERS, VISIBLE_BROKERS, type Broker } from './brokers'

export const STATUSES = ['not_listed', 'requested', 'removed', 'reappeared'] as const
export type Status = (typeof STATUSES)[number]
export const STATUS_LABEL: Record<Status, string> = { not_listed: 'Not listed', requested: 'Requested', removed: 'Removed', reappeared: 'Reappeared' }
export const RECHECK_DAYS = 60
/** Email templates are built but hidden until a broker is confirmed to accept opt-outs by email. */
export const EMAIL_TEMPLATES_ENABLED = false

export function isStatus(v: unknown): v is Status { return typeof v === 'string' && (STATUSES as readonly string[]).includes(v) }
export function isBrokerId(v: unknown): boolean { return typeof v === 'string' && BROKERS.some((b) => b.id === v) }
export function cleanName(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const n = v.replace(/\s+/g, ' ').trim()
  return n.length >= 1 && n.length <= 100 ? n : null
}

export type Summary = { total: number; untouched: number; not_listed: number; requested: number; removed: number; reappeared: number; done: number; needsAction: number }
/** Done = not listed or removed. Needs action = untouched or reappeared. */
export function summarize(statuses: Record<string, Status | undefined>, brokers: readonly Broker[] = VISIBLE_BROKERS): Summary {
  const s: Summary = { total: brokers.length, untouched: 0, not_listed: 0, requested: 0, removed: 0, reappeared: 0, done: 0, needsAction: 0 }
  for (const b of brokers) {
    const st = statuses[b.id]
    if (!st) s.untouched++; else s[st]++
  }
  s.done = s.not_listed + s.removed
  s.needsAction = s.untouched + s.reappeared
  return s
}

const pad = (n: number) => String(n).padStart(2, '0')
const icsDate = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
const icsStamp = (d: Date) => `${icsDate(d)}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
export function recheckDate(from: Date, days = RECHECK_DAYS): Date { return new Date(from.getTime() + days * 86_400_000) }

/** All-day reminder 60 days out, repeating every 60 days (6 times, about a year). No personal data in the file. */
export function buildRecheckIcs(now: Date, uid = `dr-${now.getTime()}@saasnation.site`): string {
  const start = recheckDate(now), end = new Date(start.getTime() + 86_400_000)
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SaaS Nation//Data Removal//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${icsStamp(now)}`,
    `DTSTART;VALUE=DATE:${icsDate(start)}`, `DTEND;VALUE=DATE:${icsDate(end)}`,
    `RRULE:FREQ=DAILY;INTERVAL=${RECHECK_DAYS};COUNT=6`,
    'SUMMARY:Re-check data broker listings',
    'DESCRIPTION:Listings often come back. Open saasnation.site/data-removal/tracker and search each site again.',
    'URL:https://saasnation.site/data-removal/tracker',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Re-check data broker listings', 'TRIGGER:PT9H', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n')
}

/** Pre-filled email to yourself. Opens the user's own mail app; we send nothing. */
export function buildRecheckMailto(email: string, now: Date): string {
  const d = recheckDate(now)
  const subject = `Re-check data broker listings on ${d.toISOString().slice(0, 10)}`
  const body = `Reminder: listings often come back. On ${d.toDateString()}, open https://saasnation.site/data-removal/tracker and search each site again.`
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/** Email opt-out template, filled in the browser only (address/phone are never sent to our server). Hidden while disabled. */
export function emailTemplateFor(b: Broker, p: { name: string; address?: string; phone?: string }): { to: string; subject: string; body: string } | null {
  if (!EMAIL_TEMPLATES_ENABLED || !b.emailOptOutConfirmed || !b.privacyEmail) return null
  const lines = [`Hello ${b.name} privacy team,`, '', 'Please remove my personal information from your website and stop selling or sharing it.', '', `Name: ${p.name}`]
  if (p.address) lines.push(`Address: ${p.address}`)
  if (p.phone) lines.push(`Phone: ${p.phone}`)
  lines.push('', 'Please confirm when this is done.', '', 'Thank you')
  return { to: b.privacyEmail, subject: 'Opt-out / removal request', body: lines.join('\n') }
}
