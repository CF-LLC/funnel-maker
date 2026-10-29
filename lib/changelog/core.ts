// Change log: pure logic (no I/O). Tested in tests/changelog.test.cjs.
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://saasnation.site').replace(/\/$/, '')
export const DEMO_TOKEN = 'demo'
export const MAX_PROJECTS = 200
export const MAX_REQUESTS = 200
/** v1 never sends email: the owner copies the link or opens their own mail app. */
export const CHANGELOG_SENDS_EMAIL = false

export type Status = 'pending' | 'approved' | 'declined'
export type EstKind = 'hours' | 'price'
export type Project = { id: string; title: string; client_name: string; client_email: string | null; currency: string; hourly_rate_cents: number | null; token: string; revoked: boolean; last_viewed_at: string | null; view_count: number; created_at: string; updated_at: string }
export type Req = { id: string; project_id: string; title: string; description: string | null; est_kind: EstKind; hours: number | null; price_cents: number | null; status: Status; decided_name: string | null; decided_note: string | null; decided_at: string | null; invoice_id: string | null; invoiced_at: string | null; created_at: string }

export const PROJECT_COLS = 'id,title,client_name,client_email,currency,hourly_rate_cents,token,revoked,last_viewed_at,view_count,created_at,updated_at'
export const REQ_COLS = 'id,project_id,title,description,est_kind,hours,price_cents,status,decided_name,decided_note,decided_at,invoice_id,invoiced_at,created_at'

export const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
export const isToken = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v)
export const changelogUrl = (token: string) => `${SITE}/c/${token}`
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
export function cleanEmail(v: unknown): string | null {
  const e = str(v, 200).toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null
}
/** "12.50" → 1250; rejects negatives, junk and > $1M. */
export function toCents(v: unknown): number | null {
  const s = typeof v === 'number' ? String(v) : str(v, 20).replace(/[$,\s]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  const c = Math.round(Number(s) * 100)
  return c >= 0 && c <= 100_000_000 ? c : null
}
export function cleanProject(v: any): { ok: true; p: { title: string; client_name: string; client_email: string | null; currency: string; hourly_rate_cents: number | null } } | { ok: false; error: string } {
  const title = str(v?.title, 120), client_name = str(v?.client_name, 120)
  if (!title) return { ok: false, error: 'Name the project.' }
  if (!client_name) return { ok: false, error: 'Add the client’s name.' }
  const client_email = v?.client_email ? cleanEmail(v.client_email) : null
  if (v?.client_email && !client_email) return { ok: false, error: 'That email doesn’t look right.' }
  const currency = (str(v?.currency, 3) || 'USD').toUpperCase()
  if (!/^[A-Z]{3}$/.test(currency)) return { ok: false, error: 'Currency must be a 3-letter code like USD.' }
  let hourly_rate_cents: number | null = null
  if (v?.hourly_rate !== undefined && v?.hourly_rate !== null && v?.hourly_rate !== '') { hourly_rate_cents = toCents(v.hourly_rate); if (hourly_rate_cents === null) return { ok: false, error: 'Hourly rate must be a number like 85 or 85.50.' } }
  return { ok: true, p: { title, client_name, client_email, currency, hourly_rate_cents } }
}
export function cleanRequest(v: any): { ok: true; r: { title: string; description: string | null; est_kind: EstKind; hours: number | null; price_cents: number | null } } | { ok: false; error: string } {
  const title = str(v?.title, 160)
  if (!title) return { ok: false, error: 'Describe the request in a few words.' }
  const description = str(v?.description, 2000) || null
  if (v?.est_kind === 'hours') {
    const h = Number(v?.hours)
    if (!Number.isFinite(h) || h <= 0 || h > 9999 || Math.round(h * 100) !== h * 100) return { ok: false, error: 'Hours must be a number like 2 or 1.5.' }
    return { ok: true, r: { title, description, est_kind: 'hours', hours: h, price_cents: null } }
  }
  const c = toCents(v?.price)
  if (c === null || c === 0) return { ok: false, error: 'Price must be a number like 150.' }
  return { ok: true, r: { title, description, est_kind: 'price', hours: null, price_cents: c } }
}
/** Value of one request in cents (hours × project rate; hours with no rate = 0). */
export function requestCents(r: Pick<Req, 'est_kind' | 'hours' | 'price_cents'>, rateCents: number | null): number {
  return r.est_kind === 'hours' ? Math.round(Number(r.hours || 0) * Number(rateCents || 0)) : Number(r.price_cents || 0)
}
export function totals(reqs: Req[], rateCents: number | null) {
  const sum = (s: Status) => reqs.filter((r) => r.status === s).reduce((a, r) => a + requestCents(r, rateCents), 0)
  const ready = reqs.filter((r) => r.status === 'approved' && !r.invoice_id)
  return { approved: sum('approved'), pending: sum('pending'), declined: sum('declined'), ready: ready.reduce((a, r) => a + requestCents(r, rateCents), 0), readyCount: ready.length, pendingCount: reqs.filter((r) => r.status === 'pending').length }
}
/** Approved, not-yet-invoiced requests → inv_invoice_lines rows, appended after `startPos`. */
export function toInvoiceLines(reqs: Req[], rateCents: number | null, startPos = 0) {
  return reqs.filter((r) => r.status === 'approved' && !r.invoice_id).map((r, i) => ({
    position: startPos + i,
    description: `Extra: ${r.title}${r.decided_name ? ` (approved by ${r.decided_name})` : ''}`.slice(0, 500),
    quantity: r.est_kind === 'hours' ? Number(r.hours) : 1,
    unit_price_cents: r.est_kind === 'hours' ? Number(rateCents || 0) : Number(r.price_cents || 0),
  }))
}
export function cleanDecision(v: any): { ok: true; d: { status: 'approved' | 'declined'; name: string; note: string | null } } | { ok: false; error: string } {
  if (v?.decision !== 'approved' && v?.decision !== 'declined') return { ok: false, error: 'Pick OK or No thanks.' }
  const name = str(v?.name, 120)
  if (!name) return { ok: false, error: 'Please add your name.' }
  return { ok: true, d: { status: v.decision, name, note: str(v?.note, 1000) || null } }
}
export const money = (cents: number, cur = 'USD') => { try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur || 'USD' }).format(cents / 100) } catch { return `${(cents / 100).toFixed(2)} ${cur}` } }
export const estLabel = (r: Pick<Req, 'est_kind' | 'hours' | 'price_cents'>, cur: string, rate: number | null) =>
  r.est_kind === 'hours' ? `${Number(r.hours)} h${rate ? ` · ${money(requestCents(r, rate), cur)}` : ''}` : money(Number(r.price_cents || 0), cur)
/** Owner's own mail app, prefilled. We never send it. */
export function mailtoHref(clientName: string, email: string | null, url: string) {
  const first = clientName.split(/\s+/)[0] || 'there'
  const body = `Hi ${first},\n\nHere's the running list of extra requests for our project. You can OK each one (or say no thanks) right on the page:\n${url}\n\nNo login needed; just keep this link to yourself.`
  return `mailto:${encodeURIComponent(email || '')}?subject=${encodeURIComponent('Extra requests to approve')}&body=${encodeURIComponent(body)}`
}
