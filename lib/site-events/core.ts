// Pure helpers for cookieless first-party site analytics (no I/O; unit tested).
import { createHash } from 'node:crypto'

export const SITE_EVENTS = ['pageview', 'signup_started', 'signup_completed', 'checkout_clicked', 'checkout_completed', 'free_tool_used', 'email_captured', 'upgrade_clicked', 'referral_landed', 'referral_signup', 'home_view', 'job_card_click', 'hero_trial_click', 'hero_free_tool_click', 'demo_view', 'faq_open'] as const
export type SiteEvent = (typeof SITE_EVENTS)[number]
/** Events a browser may send. checkout_completed / email_captured are written by the server only. */
export const CLIENT_EVENTS: readonly SiteEvent[] = ['pageview', 'signup_started', 'signup_completed', 'checkout_clicked', 'free_tool_used', 'upgrade_clicked', 'referral_landed', 'home_view', 'job_card_click', 'hero_trial_click', 'hero_free_tool_click', 'demo_view', 'faq_open']

const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|pingdom|uptime|curl|wget|python-requests|httpclient|axios|node-fetch|go-http|java\/|preview|monitor|scan/i
export const isBot = (ua: string | null | undefined) => !ua || ua.length < 20 || BOT.test(ua)

export function deviceFromUa(ua: string | null | undefined): 'mobile' | 'tablet' | 'desktop' {
  const s = ua || ''
  if (/ipad|tablet|kindle|silk|(android(?!.*mobile))/i.test(s)) return 'tablet'
  if (/mobi|iphone|ipod|android/i.test(s)) return 'mobile'
  return 'desktop'
}

/** Do Not Track or Global Privacy Control on the request means: store nothing. */
export const optedOut = (h: Headers) => h.get('dnt') === '1' || h.get('sec-gpc') === '1'

const clip = (v: unknown, n: number): string | null => {
  if (typeof v !== 'string') return null
  const s = v.trim().toLowerCase().replace(/[^\w.\-+ /:]/g, '').slice(0, n)
  return s || null
}
const slug = (v: unknown, n: number): string | null => (typeof v === 'string' && /^[a-z0-9][a-z0-9_-]*$/.test(v) ? v.slice(0, n) : null)

/** Host of an external referrer only (never the full URL, never our own host). */
export function referrerHost(ref: unknown, ownHosts: string[]): string | null {
  if (typeof ref !== 'string' || !ref) return null
  try {
    const h = new URL(ref).hostname.toLowerCase().replace(/^www\./, '')
    if (!h || ownHosts.some((o) => h === o || h.endsWith(`.${o}`))) return null
    return h.slice(0, 100)
  } catch { return null }
}

/** Same-site path, query and hash dropped. Private/user pages are not tracked at all. */
const PRIVATE = /^\/(dashboard|admin|api|auth\/(callback|update-password|reset-password)|f|d|e|i|s|u|a|c|p|booking|updates)(\/|$)/
export function cleanPath(v: unknown): string | null {
  if (typeof v !== 'string' || !v.startsWith('/') || v.startsWith('//')) return null
  const p = v.split(/[?#]/)[0].replace(/[^A-Za-z0-9/_\-.]/g, '').slice(0, 200)
  return p && !PRIVATE.test(p) ? p : null
}

export const utcDay = (d = new Date()) => d.toISOString().slice(0, 10)

/** Daily-rotating visitor hash: sha256(pepper|day|ip|ua), 16 hex chars. Raw IP is never stored. */
export function dailyVisitorHash(ip: string, ua: string, day: string, pepper: string): string {
  return createHash('sha256').update(`${pepper}|${day}|${ip}|${ua}`).digest('hex').slice(0, 16)
}

export type Row = { event: SiteEvent; path: string | null; referrer_host: string | null; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; device: string; tool: string | null; plan: string | null }

/** Validate a beacon body from the browser. Returns null when it is not worth storing. */
export function parseBeacon(body: any, ownHosts: string[]): Row | null {
  const event = body?.event
  if (!CLIENT_EVENTS.includes(event)) return null
  const path = cleanPath(body?.path)
  // Pageviews only count on our public pages; actions taken inside the app (e.g. a checkout click on /dashboard) keep no path.
  if (!path && (event === 'pageview' || typeof body?.path !== 'string' || !body.path.startsWith('/dashboard'))) return null
  return {
    event, path,
    referrer_host: event === 'pageview' ? referrerHost(body?.referrer, ownHosts) : null,
    utm_source: clip(body?.utm_source, 100), utm_medium: clip(body?.utm_medium, 100), utm_campaign: clip(body?.utm_campaign, 100),
    device: 'desktop', tool: slug(body?.tool, 60), plan: slug(body?.plan, 40),
  }
}

export type DayRow = { day: string; event: string; visitor_hash: string | null }
export type Daily = { day: string; visits: number; visitors: number; freeToolUses: number; signupsStarted: number; signups: number; checkoutClicks: number; checkouts: number; emails: number }

/** Daily counts (newest first) and a simple funnel total over the window. */
export function summarize(rows: DayRow[]) {
  const by = new Map<string, Daily & { _v: Set<string> }>()
  for (const r of rows) {
    const d = by.get(r.day) ?? { day: r.day, visits: 0, visitors: 0, freeToolUses: 0, signupsStarted: 0, signups: 0, checkoutClicks: 0, checkouts: 0, emails: 0, _v: new Set<string>() }
    if (r.event === 'pageview') { d.visits++; if (r.visitor_hash) d._v.add(r.visitor_hash) }
    else if (r.event === 'free_tool_used') d.freeToolUses++
    else if (r.event === 'signup_started') d.signupsStarted++
    else if (r.event === 'signup_completed') d.signups++
    else if (r.event === 'checkout_clicked') d.checkoutClicks++
    else if (r.event === 'checkout_completed') d.checkouts++
    else if (r.event === 'email_captured') d.emails++
    by.set(r.day, d)
  }
  const days: Daily[] = [...by.values()].map(({ _v, ...d }) => ({ ...d, visitors: _v.size })).sort((a, b) => (a.day < b.day ? 1 : -1))
  const sum = (k: keyof Omit<Daily, 'day'>) => days.reduce((n, d) => n + d[k], 0)
  const funnel = [
    { label: 'Visitors (daily unique, summed)', n: sum('visitors') },
    { label: 'Free tool uses', n: sum('freeToolUses') },
    { label: 'Signups', n: sum('signups') },
    { label: 'Checkout clicks', n: sum('checkoutClicks') },
    { label: 'Checkouts completed', n: sum('checkouts') },
  ]
  return { days, funnel, emails: sum('emails'), signupsStarted: sum('signupsStarted') }
}
