// Expenses: pure helpers shared by the API, the page and tests. No I/O here.
export const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
export const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T00:00:00Z'))
export const BUCKET = 'ex-receipts'
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024
export const STORAGE_CAP_BYTES = 500 * 1024 * 1024
export const SIGNED_TTL_SECONDS = 300
export const RECEIPT_TYPES: Record<string, string> = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/heic': 'heic' }
export const MAX_CENTS = 10_000_000_000
export const DEFAULT_CATEGORIES = ['Software', 'Advertising', 'Contractors', 'Equipment', 'Meals', 'Office', 'Supplies', 'Travel', 'Other']
export const EXPENSE_COLS = 'id, expense_date, amount_cents, vendor, category_id, crm_email, tt_project_id, billable, note, receipt_name, receipt_mime, receipt_bytes, invoice_id, invoiced_at'

export type Category = { id: string; name: string; archived: boolean }
export type Expense = {
  id: string; expense_date: string; amount_cents: number; vendor: string; category_id: string | null; crm_email: string | null; tt_project_id: string | null
  billable: boolean; note: string | null; receipt_name: string | null; receipt_mime: string | null; receipt_bytes: number | null; invoice_id: string | null; invoiced_at: string | null
}
export type TtProject = { id: string; name: string; client_id: string; client_name: string; client_email: string | null; client_crm_email: string | null }
export type Crm = { email: string; name: string | null; company: string | null }

/** "12", "12.5", "$1,234.56" → cents. null if unreadable, zero/negative, or too big. */
export function parseAmount(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 && Math.round(raw * 100) <= MAX_CENTS ? Math.round(raw * 100) : null
  if (typeof raw !== 'string') return null
  const s = raw.trim().replace(/^\$/, '').replace(/,/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  const c = Math.round(parseFloat(s) * 100)
  return c >= 1 && c <= MAX_CENTS ? c : null
}
export function fmtMoney(cents: number, currency = 'USD'): string {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100) } catch { return `$${(cents / 100).toFixed(2)}` }
}
export function localDate(d = new Date()): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
export const monthOf = (iso: string) => iso.slice(0, 7)
export function addMonths(ym: string, n: number): string { const [y, m] = ym.split('-').map(Number); const t = y * 12 + (m - 1) + n; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}` }
export function monthEnd(ym: string): string { const [y, m] = ym.split('-').map(Number); return `${ym}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}` }

export type CatTotal = { category_id: string | null; name: string; cents: number; count: number }
/** Totals for one month (YYYY-MM): overall, billable, unbilled-billable, and per category (largest first). */
export function monthTotals(list: Expense[], ym: string, cats: Category[]) {
  const rows = list.filter((e) => monthOf(e.expense_date) === ym)
  const byCat = new Map<string | null, CatTotal>()
  const cName = new Map(cats.map((c) => [c.id, c.name]))
  let cents = 0, billable = 0, unbilled = 0
  for (const e of rows) {
    cents += e.amount_cents
    if (e.billable) { billable += e.amount_cents; if (!e.invoice_id) unbilled += e.amount_cents }
    const k = e.category_id && cName.has(e.category_id) ? e.category_id : null
    const t = byCat.get(k) || { category_id: k, name: k ? cName.get(k)! : 'Uncategorized', cents: 0, count: 0 }
    t.cents += e.amount_cents; t.count++; byCat.set(k, t)
  }
  return { cents, billable, unbilled, count: rows.length, categories: [...byCat.values()].sort((a, b) => b.cents - a.cents) }
}
/** Totals for the last `n` months ending at ym, oldest first. */
export function monthSeries(list: Expense[], ym: string, n = 6): { ym: string; cents: number }[] {
  const out = Array.from({ length: n }, (_, i) => ({ ym: addMonths(ym, i - n + 1), cents: 0 }))
  const idx = new Map(out.map((o, i) => [o.ym, i]))
  for (const e of list) { const i = idx.get(monthOf(e.expense_date)); if (i != null) out[i].cents += e.amount_cents }
  return out
}

/** Who a billable expense is billed to: its Time project's client, else its CRM contact. null = no client linked. */
export type BillTo = { key: string; name: string; email: string | null }
export function billTo(e: Pick<Expense, 'tt_project_id' | 'crm_email'>, projects: TtProject[], crm: Crm[]): BillTo | null {
  const p = e.tt_project_id ? projects.find((x) => x.id === e.tt_project_id) : undefined
  if (p) return { key: `tt:${p.client_id}`, name: p.client_name, email: p.client_email || p.client_crm_email }
  if (e.crm_email) { const c = crm.find((x) => x.email === e.crm_email); return { key: `crm:${e.crm_email}`, name: c?.company || c?.name || e.crm_email, email: e.crm_email } }
  return null
}
export const invoiceable = (list: Expense[]) => list.filter((e) => e.billable && !e.invoice_id)
/** Group unbilled billable expenses by who they bill to ('none' = no client linked). */
export function unbilledGroups(list: Expense[], projects: TtProject[], crm: Crm[]) {
  const m = new Map<string, { to: BillTo | null; items: Expense[]; cents: number }>()
  for (const e of invoiceable(list)) {
    const to = billTo(e, projects, crm); const k = to?.key || 'none'
    const g = m.get(k) || { to, items: [], cents: 0 }; g.items.push(e); g.cents += e.amount_cents; m.set(k, g)
  }
  return [...m.values()].sort((a, b) => (a.to ? 0 : 1) - (b.to ? 0 : 1) || b.cents - a.cents)
}
export type Line = { position: number; description: string; quantity: number; unit_price_cents: number }
/** One invoice line per expense, oldest first: "Vendor · Category · date (note)". Descriptions capped at 500. */
export function toInvoiceLines(list: Expense[], cats: Category[], start = 0): Line[] {
  const cName = new Map(cats.map((c) => [c.id, c.name]))
  return [...list].sort((a, b) => a.expense_date.localeCompare(b.expense_date)).map((e, i) => {
    const bits = [e.vendor, e.category_id && cName.get(e.category_id), e.expense_date].filter(Boolean).join(' · ')
    return { position: start + i, description: (`Expense: ${bits}` + (e.note ? ` (${e.note})` : '')).slice(0, 500), quantity: 1, unit_price_cents: e.amount_cents }
  })
}
export function csvCell(v: unknown): string {
  let s = v == null ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}` // no spreadsheet formulas
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
export const CSV_HEADER = ['Date', 'Vendor', 'Category', 'Amount', 'Billable', 'Client', 'Project', 'Note', 'Receipt', 'Status']
export function toCsv(list: Expense[], cats: Category[], projects: TtProject[], crm: Crm[]): string {
  const cName = new Map(cats.map((c) => [c.id, c.name]))
  const rows = [...list].sort((a, b) => a.expense_date.localeCompare(b.expense_date)).map((e) => {
    const p = e.tt_project_id ? projects.find((x) => x.id === e.tt_project_id) : undefined
    return [e.expense_date, e.vendor, (e.category_id && cName.get(e.category_id)) || 'Uncategorized', (e.amount_cents / 100).toFixed(2), e.billable ? 'yes' : 'no',
      billTo(e, projects, crm)?.name || '', p?.name || '', e.note || '', e.receipt_name ? 'yes' : 'no', e.invoice_id ? 'billed' : e.billable ? 'unbilled' : '']
  })
  return [CSV_HEADER, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
export function cleanText(v: unknown, max: number): string | null {
  if (v == null) return null
  if (typeof v !== 'string') return null
  const s = v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim()
  return s ? s.slice(0, max) : null
}
export function cleanEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 320 ? s : null
}
/** Validate a create/update body. Returns the DB row fields or an error. `partial` allows missing fields (PATCH). */
export function parseExpense(b: any, partial = false): { row: Record<string, unknown> } | { error: string } {
  const row: Record<string, unknown> = {}
  const has = (k: string) => b && Object.prototype.hasOwnProperty.call(b, k)
  if (!partial || has('expense_date')) { if (!isDate(b?.expense_date)) return { error: 'Pick a date.' }; row.expense_date = b.expense_date }
  if (!partial || has('amount')) { const c = parseAmount(b?.amount); if (c == null) return { error: 'Enter an amount like 12.50.' }; row.amount_cents = c }
  if (!partial || has('vendor')) { const v = cleanText(b?.vendor, 120); if (!v) return { error: 'Add a vendor.' }; row.vendor = v }
  if (!partial || has('category_id')) { if (b?.category_id != null && b.category_id !== '' && !isUuid(b.category_id)) return { error: 'Bad category.' }; row.category_id = b?.category_id || null }
  if (!partial || has('crm_email')) { const e = b?.crm_email ? cleanEmail(b.crm_email) : null; if (b?.crm_email && !e) return { error: 'Bad contact.' }; row.crm_email = e }
  if (!partial || has('tt_project_id')) { if (b?.tt_project_id != null && b.tt_project_id !== '' && !isUuid(b.tt_project_id)) return { error: 'Bad project.' }; row.tt_project_id = b?.tt_project_id || null }
  if (!partial || has('billable')) row.billable = b?.billable === true
  if (!partial || has('note')) row.note = cleanText(b?.note, 500)
  return { row }
}
