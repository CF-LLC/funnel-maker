// Client list (CRM): pure aggregation, filtering and CSV helpers (no I/O; unit-tested).
export const CRM_STATUSES = ['lead', 'active', 'past', 'not_a_fit'] as const
export type CrmStatus = (typeof CRM_STATUSES)[number]
export const STATUS_LABEL: Record<CrmStatus, string> = { lead: 'Lead', active: 'Active', past: 'Past client', not_a_fit: 'Not a fit' }
export const isStatus = (v: unknown): v is CrmStatus => typeof v === 'string' && (CRM_STATUSES as readonly string[]).includes(v)

export const SOURCES = ['form', 'booking', 'proposal', 'invoice'] as const
export type Source = (typeof SOURCES)[number]
export const SOURCE_LABEL: Record<Source, string> = { form: 'Form', booking: 'Booking', proposal: 'Proposal', invoice: 'Invoice' }
export const isSource = (v: unknown): v is Source => typeof v === 'string' && (SOURCES as readonly string[]).includes(v)

/** One thing that happened with a contact in another tool. href links to that tool's page. */
export type Activity = {
  source: Source
  id: string
  email: string
  name?: string | null
  phone?: string | null
  at: string
  title: string
  href: string
  detail?: string | null
  /** Invoices only: total in cents and whether it is paid. */
  amountCents?: number
  currency?: string
  paid?: boolean
}
export type OwnContact = { email: string; name?: string | null; phone?: string | null; company?: string | null; status: CrmStatus; tags: string[]; follow_up_on?: string | null; created_at?: string; updated_at?: string }
export type Contact = {
  email: string
  name: string
  phone: string
  company: string
  status: CrmStatus
  tags: string[]
  followUpOn: string | null
  sources: Source[]
  counts: Record<Source, number>
  firstSeen: string
  lastActivity: string
  invoicedCents: number
  paidCents: number
  currency: string | null
  saved: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export function normEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const e = v.trim().toLowerCase()
  return e.length <= 320 && EMAIL_RE.test(e) ? e : null
}

/** Pull email / name / phone out of a Forms response using the form's field definitions. */
export function formContact(fields: { id: string; type: string; label: string }[], data: Record<string, unknown> | null | undefined) {
  const d = data || {}
  const val = (f?: { id: string }) => (f && typeof d[f.id] === 'string' ? String(d[f.id]).trim() : '')
  const email = normEmail(val(fields.find((f) => f.type === 'email')) || Object.values(d).find((v) => normEmail(v)))
  const nameField = fields.find((f) => f.type === 'short_text' && /\bname\b/i.test(f.label)) || fields.find((f) => f.type === 'short_text')
  return { email, name: val(nameField) || null, phone: val(fields.find((f) => f.type === 'phone')) || null }
}

const later = (a: string, b: string) => (a > b ? a : b)
const earlier = (a: string, b: string) => (a < b ? a : b)

/** Merge activity from every tool with the CRM's own rows. Deduped by lowercase email; newest activity first. */
export function aggregate(activities: Activity[], own: OwnContact[] = []): Contact[] {
  const map = new Map<string, Contact>()
  const get = (email: string, at: string) => {
    let c = map.get(email)
    if (!c) {
      c = { email, name: '', phone: '', company: '', status: 'lead', tags: [], followUpOn: null, sources: [], counts: { form: 0, booking: 0, proposal: 0, invoice: 0 },
        firstSeen: at, lastActivity: at, invoicedCents: 0, paidCents: 0, currency: null, saved: false }
      map.set(email, c)
    }
    return c
  }
  const sorted = [...activities].sort((a, b) => (a.at < b.at ? -1 : 1))
  for (const a of sorted) {
    const email = normEmail(a.email); if (!email) continue
    const c = get(email, a.at)
    c.counts[a.source]++
    if (!c.sources.includes(a.source)) c.sources.push(a.source)
    c.firstSeen = earlier(c.firstSeen, a.at); c.lastActivity = later(c.lastActivity, a.at)
    if (a.name?.trim()) c.name = a.name.trim() // newest non-empty wins (sorted ascending)
    if (a.phone?.trim()) c.phone = a.phone.trim()
    if (a.source === 'invoice' && typeof a.amountCents === 'number') {
      if (!c.currency) c.currency = a.currency || 'USD'
      if ((a.currency || 'USD') === c.currency) { c.invoicedCents += a.amountCents; if (a.paid) c.paidCents += a.amountCents }
    }
  }
  for (const o of own) {
    const email = normEmail(o.email); if (!email) continue
    const c = get(email, o.created_at || new Date(0).toISOString())
    c.saved = true
    if (o.name?.trim()) c.name = o.name.trim()
    if (o.phone?.trim()) c.phone = o.phone.trim()
    if (o.company?.trim()) c.company = o.company.trim()
    if (isStatus(o.status)) c.status = o.status
    c.tags = cleanTags(o.tags || [])
    c.followUpOn = o.follow_up_on || null
    if (o.updated_at) c.lastActivity = later(c.lastActivity, o.updated_at)
  }
  for (const c of map.values()) c.sources.sort((a, b) => SOURCES.indexOf(a) - SOURCES.indexOf(b))
  return [...map.values()].sort((a, b) => (a.lastActivity < b.lastActivity ? 1 : a.lastActivity > b.lastActivity ? -1 : a.email.localeCompare(b.email)))
}

export function cleanTags(tags: unknown): string[] {
  const list = Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',') : []
  const out: string[] = []
  for (const t of list) {
    const v = String(t).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '').slice(0, 30)
    if (v && !out.includes(v)) out.push(v)
  }
  return out.slice(0, 20)
}

export type Filters = { q?: string; status?: string; source?: string; tag?: string; due?: boolean }
export function filterContacts(list: Contact[], f: Filters, today = new Date().toISOString().slice(0, 10)): Contact[] {
  const q = (f.q || '').trim().toLowerCase()
  return list.filter((c) =>
    (!q || [c.email, c.name, c.company, c.phone, ...c.tags].some((v) => v.toLowerCase().includes(q))) &&
    (!isStatus(f.status) || c.status === f.status) &&
    (!isSource(f.source) || c.sources.includes(f.source)) &&
    (!f.tag || c.tags.includes(f.tag)) &&
    (!f.due || (!!c.followUpOn && c.followUpOn <= today)))
}

/** CSV cell: quoted, and spreadsheet formula injection neutralized. */
export function csvCell(v: unknown): string {
  let s = v == null ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
  return '"' + s.replace(/"/g, '""') + '"'
}
export const CSV_HEADER = ['Email', 'Name', 'Phone', 'Company', 'Status', 'Tags', 'Follow up on', 'Sources', 'Forms', 'Bookings', 'Proposals', 'Invoices', 'Invoiced', 'Paid', 'Currency', 'First seen', 'Last activity']
export function toCsv(list: Contact[]): string {
  const money = (c: number) => (c / 100).toFixed(2)
  const rows = list.map((c) => [c.email, c.name, c.phone, c.company, STATUS_LABEL[c.status], c.tags.join(' '), c.followUpOn || '', c.sources.map((s) => SOURCE_LABEL[s]).join(' '),
    c.counts.form, c.counts.booking, c.counts.proposal, c.counts.invoice, money(c.invoicedCents), money(c.paidCents), c.currency || '', c.firstSeen.slice(0, 10), c.lastActivity.slice(0, 10)])
  return [CSV_HEADER, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

export const contactHref = (email: string) => `/crm/${encodeURIComponent(email)}`
