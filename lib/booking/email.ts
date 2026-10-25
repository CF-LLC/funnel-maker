// Booking emails: pure renderers (tested) + a best-effort Resend HTTP sender.
// Sends only when RESEND_API_KEY is set. Transactional only; never throws to the caller.
import { buildIcs } from '@/lib/booking/core'

export const SITE_URL = 'https://saasnation.site'
export const DEFAULT_FROM = 'SaaS Nation <bookings@saasnation.site>'

export type BookingMail = {
  id: string; start: string; end: string
  typeName: string; durationMin: number; location: string | null
  hostName: string; hostEmail: string; hostTz: string; handle: string; typeSlug: string
  bookerName: string; bookerEmail: string; bookerTz: string; notes: string | null
}
export type Rendered = { subject: string; html: string; text: string }

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim()

export function fmtWhen(iso: string, tz: string) {
  const d = new Date(iso)
  return {
    day: d.toLocaleDateString('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }),
    zone: d.toLocaleTimeString('en-US', { timeZone: tz, timeZoneName: 'short' }).split(' ').pop() || tz,
    tz,
  }
}

export function googleCalUrl(m: BookingMail, title: string) {
  const f = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const q = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${f(m.start)}/${f(m.end)}`, ...(m.location ? { location: m.location } : {}) })
  return `https://calendar.google.com/calendar/render?${q}`
}

export const icsFor = (m: BookingMail, title: string) =>
  buildIcs({ uid: m.id, start: m.start, end: m.end, title, location: m.location, description: m.notes || undefined })

// ---------- HTML shell: dark card, bgcolor attributes so Gmail light mode keeps it dark ----------
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
function shell(preheader: string, eyebrow: string, title: string, body: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#0a0a0c;" bgcolor="#0a0a0c">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0a0a0c" style="background:#0a0a0c;"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 4px 18px;font-family:${FONT};font-size:15px;font-weight:800;letter-spacing:.5px;color:#ffffff;"><span style="color:#a78bfa;">&#9679;</span> SaaS&nbsp;Nation</td></tr>
<tr><td bgcolor="#141418" style="background:#141418;background-image:linear-gradient(135deg,#4c1d95 0%,#1e1b4b 45%,#141418 100%);border-radius:18px 18px 0 0;padding:34px 28px 26px;font-family:${FONT};">
<div style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#c4b5fd;">${esc(eyebrow)}</div>
<h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;font-weight:800;color:#ffffff;">${esc(title)}</h1>
</td></tr>
<tr><td bgcolor="#141418" style="background:#141418;border-radius:0 0 18px 18px;padding:8px 28px 30px;font-family:${FONT};color:#e4e4e7;font-size:15px;line-height:1.6;">${body}</td></tr>
<tr><td style="padding:18px 4px;font-family:${FONT};font-size:12px;line-height:1.5;color:#8b8b95;">This is a transactional email about a booking made at saasnation.site. Booking powered by <a href="${SITE_URL}" style="color:#a78bfa;">SaaS Nation</a>.</td></tr>
</table></td></tr></table></body></html>`
}

function timeCard(main: ReturnType<typeof fmtWhen>, other: ReturnType<typeof fmtWhen> | null, otherLabel: string, meta: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;"><tr><td bgcolor="#1d1b2e" style="background:#1d1b2e;border:1px solid #3b2f6b;border-left:4px solid #8b5cf6;border-radius:14px;padding:20px 22px;">
<div style="font-size:13px;color:#c4b5fd;font-weight:700;">${esc(main.day)}</div>
<div style="font-size:34px;line-height:1.15;font-weight:800;color:#ffffff;margin-top:4px;">${esc(main.time)} <span style="font-size:16px;color:#a1a1aa;font-weight:600;">${esc(main.zone)}</span></div>
<div style="font-size:13px;color:#a1a1aa;margin-top:6px;">${esc(meta)}</div>
${other && other.tz !== main.tz ? `<div style="font-size:13px;color:#a1a1aa;margin-top:8px;border-top:1px solid #2e2a45;padding-top:8px;">${esc(otherLabel)}: ${esc(other.day)}, ${esc(other.time)} ${esc(other.zone)}</div>` : ''}
</td></tr></table>`
}
const button = (href: string, label: string, primary: boolean) =>
  `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 10px 0;padding:13px 20px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;${primary ? 'background:#7c3aed;color:#ffffff;border:1px solid #7c3aed;' : 'background:#141418;color:#ffffff;border:1px solid #52525b;'}">${esc(label)}</a>`
const row = (k: string, v: string) => `<tr><td style="padding:6px 12px 6px 0;color:#8b8b95;font-size:13px;vertical-align:top;white-space:nowrap;">${esc(k)}</td><td style="padding:6px 0;color:#f4f4f5;font-size:14px;">${v}</td></tr>`

export function renderBookerConfirmation(m: BookingMail): Rendered {
  const title = `${oneLine(m.typeName)} with ${oneLine(m.hostName)}`
  const w = fmtWhen(m.start, m.bookerTz), h = fmtWhen(m.start, m.hostTz)
  const meta = `${m.durationMin} min${m.location ? ` · ${oneLine(m.location)}` : ''}`
  const html = shell(`${w.day} at ${w.time} ${w.zone}`, 'Booking confirmed', `You're booked, ${oneLine(m.bookerName)}.`, `
<p style="margin:16px 0 0;">Your <strong style="color:#fff;">${esc(oneLine(m.typeName))}</strong> with <strong style="color:#fff;">${esc(oneLine(m.hostName))}</strong> is on the calendar.</p>
${timeCard(w, h, `${oneLine(m.hostName)}'s time`, meta)}
<div>${button(googleCalUrl(m, title), 'Add to Google Calendar', true)}${button(`mailto:${m.hostEmail}?subject=${encodeURIComponent(`Re: ${title}`)}`, 'Reschedule or cancel', false)}</div>
<p style="margin:8px 0 0;font-size:13px;color:#a1a1aa;">A calendar file (.ics) is attached for Apple Calendar or Outlook. Need to change something? Just reply to this email to reach ${esc(oneLine(m.hostName))}.</p>`)
  const text = [`You're booked, ${oneLine(m.bookerName)}.`, '', title, `${w.day}, ${w.time} ${w.zone}`, ...(h.tz !== w.tz ? [`(${oneLine(m.hostName)}'s time: ${h.day}, ${h.time} ${h.zone})`] : []), meta, '',
    `Add to Google Calendar: ${googleCalUrl(m, title)}`, 'A calendar file (.ics) is attached.', '', `Need to reschedule or cancel? Reply to this email to reach ${oneLine(m.hostName)}.`, '', '— SaaS Nation (transactional email about your booking)'].join('\n')
  return { subject: `Confirmed: ${title} on ${w.day.replace(/, \d{4}$/, '')} at ${w.time}`, html, text }
}

export function renderHostNotification(m: BookingMail): Rendered {
  const h = fmtWhen(m.start, m.hostTz), b = fmtWhen(m.start, m.bookerTz)
  const meta = `${m.durationMin} min · ${oneLine(m.typeName)}`
  const manage = `${SITE_URL}/booking`
  const html = shell(`${oneLine(m.bookerName)} booked ${h.day} at ${h.time}`, 'New booking', `${oneLine(m.bookerName)} booked a ${oneLine(m.typeName)}.`, `
${timeCard(h, b, "Booker's time", meta)}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 16px;">
${row('Name', esc(oneLine(m.bookerName)))}${row('Email', `<a href="mailto:${esc(m.bookerEmail)}" style="color:#c4b5fd;">${esc(m.bookerEmail)}</a>`)}
${m.notes ? row('Notes', esc(m.notes).replace(/\n/g, '<br>')) : ''}${m.location ? row('Where', esc(oneLine(m.location))) : ''}</table>
<div>${button(manage, 'Manage bookings', true)}${button(googleCalUrl(m, `${oneLine(m.typeName)} with ${oneLine(m.bookerName)}`), 'Add to Google Calendar', false)}</div>
<p style="margin:8px 0 0;font-size:13px;color:#a1a1aa;">Reply to this email to reach ${esc(oneLine(m.bookerName))} directly. You can cancel from your Booking dashboard.</p>`)
  const text = [`New booking: ${oneLine(m.bookerName)} booked a ${oneLine(m.typeName)}.`, '', `${h.day}, ${h.time} ${h.zone}`, ...(b.tz !== h.tz ? [`(Booker's time: ${b.day}, ${b.time} ${b.zone})`] : []), meta, '',
    `Name: ${oneLine(m.bookerName)}`, `Email: ${m.bookerEmail}`, ...(m.notes ? [`Notes: ${m.notes}`] : []), ...(m.location ? [`Where: ${oneLine(m.location)}`] : []), '',
    `Manage or cancel: ${manage}`, `Reply to this email to reach ${oneLine(m.bookerName)}.`].join('\n')
  return { subject: `New booking: ${oneLine(m.bookerName)} · ${h.day.replace(/, \d{4}$/, '')} at ${h.time}`, html, text }
}

export function renderCancellation(m: BookingMail): Rendered {
  const title = `${oneLine(m.typeName)} with ${oneLine(m.hostName)}`
  const w = fmtWhen(m.start, m.bookerTz)
  const rebook = `${SITE_URL}/@${m.handle}/book/${m.typeSlug}`
  const html = shell(`${title} on ${w.day} was cancelled`, 'Booking cancelled', 'Your booking was cancelled.', `
<p style="margin:16px 0 0;">${esc(oneLine(m.hostName))} cancelled your <strong style="color:#fff;">${esc(oneLine(m.typeName))}</strong>. Please remove it from your calendar.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;"><tr><td bgcolor="#1f1416" style="background:#1f1416;border:1px solid #5b2330;border-left:4px solid #f43f5e;border-radius:14px;padding:18px 22px;">
<div style="font-size:13px;color:#fda4af;font-weight:700;">${esc(w.day)}</div><div style="font-size:26px;font-weight:800;color:#ffffff;text-decoration:line-through;">${esc(w.time)} <span style="font-size:15px;color:#a1a1aa;">${esc(w.zone)}</span></div></td></tr></table>
<div>${button(rebook, 'Pick a new time', true)}</div>
<p style="margin:8px 0 0;font-size:13px;color:#a1a1aa;">Questions? Reply to this email to reach ${esc(oneLine(m.hostName))}.</p>`)
  const text = [`Your booking was cancelled.`, '', `${oneLine(m.hostName)} cancelled your ${oneLine(m.typeName)} on ${w.day}, ${w.time} ${w.zone}.`, 'Please remove it from your calendar.', '', `Pick a new time: ${rebook}`, `Reply to this email to reach ${oneLine(m.hostName)}.`].join('\n')
  return { subject: `Cancelled: ${title} on ${w.day.replace(/, \d{4}$/, '')}`, html, text }
}

// ---------- Sending ----------
export type Outgoing = Rendered & { to: string; replyTo: string; attachments?: { filename: string; content: string; content_type?: string }[] }

/** Request body for Resend's POST /emails. Exported for tests. */
export function resendPayload(o: Outgoing, from = process.env.BOOKING_EMAIL_FROM || DEFAULT_FROM) {
  return { from, to: [o.to], reply_to: o.replyTo, subject: oneLine(o.subject), html: o.html, text: o.text, ...(o.attachments?.length ? { attachments: o.attachments } : {}), headers: { 'X-Entity-Ref-ID': crypto.randomUUID() } }
}

/** Best effort: returns false (and logs) on any failure; never throws. No-op without RESEND_API_KEY. */
export async function sendMail(o: Outgoing, f: typeof fetch = fetch): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) return false
  try {
    const res = await f('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(resendPayload(o)), signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) { console.error('[booking-email] send failed', res.status, (await res.text().catch(() => '')).slice(0, 200)); return false }
    return true
  } catch (e) { console.error('[booking-email] send error', (e as Error).message); return false }
}

export const emailConfigured = () => !!process.env.RESEND_API_KEY

const icsAttachment = (m: BookingMail, title: string) => ({ filename: 'invite.ics', content: Buffer.from(icsFor(m, title)).toString('base64'), content_type: 'text/calendar; charset=utf-8; method=PUBLISH' })

/** Booker confirmation + host notification for one new booking. */
export async function sendBookingCreated(m: BookingMail, f: typeof fetch = fetch) {
  if (!emailConfigured()) return { booker: false, host: false }
  const [booker, host] = await Promise.all([
    sendMail({ ...renderBookerConfirmation(m), to: m.bookerEmail, replyTo: m.hostEmail, attachments: [icsAttachment(m, `${oneLine(m.typeName)} with ${oneLine(m.hostName)}`)] }, f),
    sendMail({ ...renderHostNotification(m), to: m.hostEmail, replyTo: m.bookerEmail, attachments: [icsAttachment(m, `${oneLine(m.typeName)} with ${oneLine(m.bookerName)}`)] }, f),
  ])
  return { booker, host }
}

export async function sendBookingCancelled(m: BookingMail, f: typeof fetch = fetch) {
  if (!emailConfigured()) return false
  return sendMail({ ...renderCancellation(m), to: m.bookerEmail, replyTo: m.hostEmail }, f)
}
