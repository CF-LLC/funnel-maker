// Time tracking: pure helpers shared by the API, the page and tests. No I/O here.
export const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
export const MAX_SECONDS = 86_400
export const ENTRY_COLS = 'id, project_id, entry_date, started_at, seconds, note, billable, invoice_id, invoiced_at'

export type Settings = { default_rate_cents: number | null; currency: string }
export type Client = { id: string; name: string; email: string | null; crm_email: string | null; archived: boolean }
export type Project = { id: string; client_id: string; name: string; hourly_rate_cents: number | null; billable: boolean; archived: boolean }
export type Entry = { id: string; project_id: string; entry_date: string; started_at: string | null; seconds: number | null; note: string | null; billable: boolean; invoice_id: string | null; invoiced_at: string | null }

export const isRunning = (e: Pick<Entry, 'seconds'>) => e.seconds == null
/** Seconds for an entry; a running timer counts up to `now`, capped at 24h. */
export function entrySeconds(e: Pick<Entry, 'seconds' | 'started_at'>, now = Date.now()): number {
  if (e.seconds != null) return e.seconds
  if (!e.started_at) return 0
  return Math.max(0, Math.min(MAX_SECONDS, Math.floor((now - Date.parse(e.started_at)) / 1000)))
}
export function rateFor(p: Pick<Project, 'hourly_rate_cents'> | undefined, s: Pick<Settings, 'default_rate_cents'> | null): number {
  return p?.hourly_rate_cents ?? s?.default_rate_cents ?? 0
}
/** Money in cents = hours x rate, only for billable entries. */
export function entryCents(e: Entry, p: Project | undefined, s: Settings | null, now = Date.now()): number {
  if (!e.billable) return 0
  return Math.round((entrySeconds(e, now) / 3600) * rateFor(p, s))
}

/** "1:30", "1h 30m", "90m", "1.5", "1.5h" → seconds. null if unreadable or outside 1 minute..24h. */
export function parseDuration(raw: unknown): number | null {
  if (typeof raw === 'number') return raw > 0 && raw <= MAX_SECONDS ? Math.round(raw) : null
  if (typeof raw !== 'string') return null
  const s = raw.trim().toLowerCase().replace(/\s+/g, ' ')
  let sec: number | null = null
  let m: RegExpMatchArray | null
  if ((m = s.match(/^(\d{1,2}):([0-5]\d)$/))) sec = +m[1] * 3600 + +m[2] * 60
  else if ((m = s.match(/^(?:(\d+(?:\.\d+)?) ?h(?:rs?|ours?)?)? ?(?:(\d+) ?m(?:in(?:s|utes?)?)?)?$/)) && (m[1] || m[2])) sec = Math.round((+(m[1] || 0)) * 3600 + +(m[2] || 0) * 60)
  else if ((m = s.match(/^(\d+(?:\.\d+)?)$/))) sec = Math.round(+m[1] * 3600)
  return sec != null && sec >= 60 && sec <= MAX_SECONDS ? sec : null
}
export function fmtDuration(sec: number, clock = false): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  if (clock) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${h}:${String(m).padStart(2, '0')}`
}
export const fmtHours = (sec: number) => (sec / 3600).toFixed(2)
export function fmtMoney(cents: number, currency = 'USD'): string {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100) } catch { return `${(cents / 100).toFixed(2)} ${currency}` }
}
export const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T00:00:00Z'))
export function addDays(iso: string, d: number): string { return new Date(Date.parse(iso + 'T00:00:00Z') + d * 86_400_000).toISOString().slice(0, 10) }
/** Monday of the ISO week containing `iso`. */
export function weekStart(iso: string): string { const dow = new Date(iso + 'T00:00:00Z').getUTCDay(); return addDays(iso, -((dow + 6) % 7)) }
export function localDate(d = new Date()): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export type Total = { id: string; name: string; seconds: number; billableSeconds: number; cents: number }
/** Totals per project and per client for a set of entries. */
export function totals(entries: Entry[], projects: Project[], clients: Client[], s: Settings | null, now = Date.now()) {
  const pById = new Map(projects.map((p) => [p.id, p])), cById = new Map(clients.map((c) => [c.id, c]))
  const byP = new Map<string, Total>(), byC = new Map<string, Total>()
  let seconds = 0, cents = 0, unbilledCents = 0
  const bump = (m: Map<string, Total>, id: string, name: string, sec: number, bill: number, c: number) => {
    const t = m.get(id) || { id, name, seconds: 0, billableSeconds: 0, cents: 0 }
    t.seconds += sec; t.billableSeconds += bill; t.cents += c; m.set(id, t)
  }
  for (const e of entries) {
    const p = pById.get(e.project_id); const c = p ? cById.get(p.client_id) : undefined
    const sec = entrySeconds(e, now), money = entryCents(e, p, s, now)
    seconds += sec; cents += money; if (!e.invoice_id && !isRunning(e)) unbilledCents += money
    bump(byP, e.project_id, p ? `${p.name}` : 'Unknown project', sec, e.billable ? sec : 0, money)
    bump(byC, p?.client_id || '-', c?.name || 'Unknown client', sec, e.billable ? sec : 0, money)
  }
  const sort = (m: Map<string, Total>) => [...m.values()].sort((a, b) => b.seconds - a.seconds)
  return { seconds, cents, unbilledCents, projects: sort(byP), clients: sort(byC) }
}

/** Entries that can go on an invoice: stopped, billable, not billed, with more than 0 seconds. */
export const invoiceable = (list: Entry[]) => list.filter((e) => !isRunning(e) && e.billable && !e.invoice_id && (e.seconds || 0) > 0)

export type Line = { position: number; description: string; quantity: number; unit_price_cents: number }
/** Invoice lines from unbilled time. quantity = hours (2 decimals, min 0.01), unit price = hourly rate.
 * mode 'project': one line per project; 'entry': one line per entry. */
export function toInvoiceLines(list: Entry[], projects: Project[], s: Settings | null, mode: 'project' | 'entry', start = 0): Line[] {
  const pById = new Map(projects.map((p) => [p.id, p]))
  const hrs = (sec: number) => Math.max(0.01, Math.round((sec / 3600) * 100) / 100)
  const sorted = [...list].sort((a, b) => a.entry_date.localeCompare(b.entry_date))
  if (mode === 'entry') {
    return sorted.map((e, i) => {
      const p = pById.get(e.project_id)
      const desc = `${p?.name || 'Time'} · ${e.entry_date}${e.note ? ` · ${e.note}` : ''}`
      return { position: start + i, description: desc.slice(0, 500), quantity: hrs(e.seconds || 0), unit_price_cents: rateFor(p, s) }
    })
  }
  const groups = new Map<string, Entry[]>()
  for (const e of sorted) groups.set(e.project_id, [...(groups.get(e.project_id) || []), e])
  return [...groups.entries()].map(([pid, es], i) => {
    const p = pById.get(pid), sec = es.reduce((n, e) => n + (e.seconds || 0), 0)
    const range = es[0].entry_date === es[es.length - 1].entry_date ? es[0].entry_date : `${es[0].entry_date} to ${es[es.length - 1].entry_date}`
    return { position: start + i, description: `${p?.name || 'Time'}: ${es.length} ${es.length === 1 ? 'entry' : 'entries'}, ${range}`.slice(0, 500), quantity: hrs(sec), unit_price_cents: rateFor(p, s) }
  })
}

export function csvCell(v: unknown): string {
  let s = v == null ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}` // spreadsheet formula injection
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
export const CSV_HEADER = ['Date', 'Client', 'Project', 'Note', 'Hours', 'Duration', 'Billable', 'Rate', 'Amount', 'Status']
export function toCsv(entries: Entry[], projects: Project[], clients: Client[], s: Settings | null): string {
  const pById = new Map(projects.map((p) => [p.id, p])), cById = new Map(clients.map((c) => [c.id, c]))
  const cur = s?.currency || 'USD'
  const rows = [...entries].filter((e) => !isRunning(e)).sort((a, b) => a.entry_date.localeCompare(b.entry_date)).map((e) => {
    const p = pById.get(e.project_id), c = p ? cById.get(p.client_id) : undefined, sec = e.seconds || 0
    return [e.entry_date, c?.name || '', p?.name || '', e.note || '', fmtHours(sec), fmtDuration(sec), e.billable ? 'yes' : 'no',
      (rateFor(p, s) / 100).toFixed(2) + ' ' + cur, (entryCents(e, p, s) / 100).toFixed(2) + ' ' + cur, e.invoice_id ? 'billed' : 'unbilled']
  })
  return [CSV_HEADER, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
export function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim()
  return t ? t.slice(0, max) : null
}
/** Rate input in dollars ("85", "85.50") → cents, '' → null. undefined if invalid. */
export function parseRate(v: unknown): number | null | undefined {
  if (v === null || v === '' || v === undefined) return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[$,\s]/g, ''))
  return Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? Math.round(n * 100) : undefined
}
