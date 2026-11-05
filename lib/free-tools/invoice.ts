import { addDaysISO, formatCurrency, todayISO, totals } from '@/lib/invoices/core'
import type { PreviewData } from '@/components/invoices/invoice-preview'

export const FREE_INVOICE_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'CHF', 'INR', 'MXN', 'SGD'] as const

export type FreeInvoiceForm = {
  fromName: string; fromEmail: string; fromAddress: string
  toName: string; toEmail: string; toAddress: string
  number: string; issueDate: string; dueDate: string
  currency: string; taxRate: string; notes: string
  lines: { description: string; quantity: string; price: string }[]
}

export function blankFreeInvoice(today = todayISO()): FreeInvoiceForm {
  return {
    fromName: '', fromEmail: '', fromAddress: '', toName: '', toEmail: '', toAddress: '',
    number: 'INV-0001', issueDate: today, dueDate: addDaysISO(today, 14), currency: 'USD', taxRate: '', notes: '',
    lines: [{ description: '', quantity: '1', price: '' }],
  }
}

type Parsed = { kind: 'blank' } | { kind: 'bad' } | { kind: 'ok'; n: number }

/** Blank stays blank, including a minus sign still being typed. Exponent text such as 1e308 is rejected. */
function parseNum(raw: string): Parsed {
  const s = String(raw ?? '').trim().replace(/,/g, '')
  if (!s || s === '+' || s === '-' || /^[+-]?\.$/.test(s)) return { kind: 'blank' }
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) return { kind: 'bad' }
  const n = Number(s)
  return Number.isFinite(n) ? { kind: 'ok', n } : { kind: 'bad' }
}

/** Cents for a line that preview and PDF can format. Negative prices stay; non-finite products do not. */
function lineCents(qty: number, price: number): number | null {
  const cents = Math.round(price * 100)
  const amount = Math.round(Math.max(0, qty) * cents)
  if (!Number.isFinite(cents) || !Number.isSafeInteger(cents)) return null
  if (!Number.isFinite(amount) || !Number.isSafeInteger(amount)) return null
  return cents
}

function lineActive(l: FreeInvoiceForm['lines'][number]): boolean {
  const q = parseNum(l.quantity)
  const p = parseNum(l.price)
  if (q.kind === 'bad' || p.kind === 'bad') return true
  if (l.description.trim()) return true
  if (p.kind === 'ok' && p.n !== 0) return true
  return false
}

const TOO_LARGE = 'These amounts are too large to total exactly.'

function currencyOf(raw: string): string {
  return (FREE_INVOICE_CURRENCIES as readonly string[]).includes(raw) ? raw : 'USD'
}

function taxRateOf(raw: string): number | null {
  const tax = parseNum(raw)
  const taxN = tax.kind === 'ok' ? Math.min(100, Math.max(0, tax.n)) : 0
  return taxN || null
}

/** The exact currency string for these cents. Safe cent amounts are at most 15 digits, so the dollar part is exact. */
function exactCurrency(cents: bigint, currency: string): string {
  const neg = cents < BigInt(0)
  const abs = neg ? -cents : cents
  const frac = (abs % BigInt(100)).toString().padStart(2, '0')
  const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0, useGrouping: true }).format(Number(abs / BigInt(100)))
  const sample = new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).formatToParts(neg ? -1 : 1)
  return sample.map((p) => p.type === 'integer' ? grouped : p.type === 'fraction' ? frac : p.type === 'minusSign' ? (neg ? p.value : '') : p.value).join('')
}

function centsHold(cents: bigint, currency: string): boolean {
  if (cents > BigInt(Number.MAX_SAFE_INTEGER) || cents < -BigInt(Number.MAX_SAFE_INTEGER)) return false
  return formatCurrency(Number(cents), currency) === exactCurrency(cents, currency)
}

/** Math.round for an exact integer ratio. Ties go toward +∞, matching the production total. */
function roundDiv(n: bigint, d: bigint): bigint {
  const q = n / d
  const r = n % d
  if (r === BigInt(0)) return q
  const ar = r < BigInt(0) ? -r : r
  const two = BigInt(2)
  if (ar * two < d) return q
  if (ar * two > d) return q + (n > BigInt(0) ? BigInt(1) : -BigInt(1))
  return q + (n > BigInt(0) ? BigInt(1) : BigInt(0))
}

function taxRatio(raw: string): { num: bigint, den: bigint } {
  const p = parseNum(raw)
  if (p.kind !== 'ok' || p.n <= 0) return { num: BigInt(0), den: BigInt(1) }
  if (p.n >= 100) return { num: BigInt(1), den: BigInt(1) }
  const m = /^[+-]?(\d*)(?:\.(\d*))?$/.exec(String(raw).trim().replace(/,/g, ''))
  if (!m) return { num: BigInt(0), den: BigInt(1) }
  const frac = m[2] ?? ''
  const digits = `${m[1] || '0'}${frac}`.replace(/^0+(?=\d)/, '') || '0'
  return { num: BigInt(digits), den: BigInt(100) * (BigInt(10) ** BigInt(frac.length)) }
}

type DraftLine = { description: string, quantity: number, unit_price_cents: number }

function draftLines(f: FreeInvoiceForm): DraftLine[] {
  return f.lines.flatMap((l) => {
    if (!lineActive(l)) return []
    const q = parseNum(l.quantity)
    const p = parseNum(l.price)
    if (q.kind === 'bad' || p.kind === 'bad') return []
    const qn = q.kind === 'ok' ? q.n : 0
    const pn = p.kind === 'ok' ? p.n : 0
    const cents = lineCents(qn, pn)
    if (cents == null) return []
    return [{ description: l.description.trim(), quantity: Math.max(0, qn), unit_price_cents: cents }]
  })
}

function lineAmounts(lines: DraftLine[]): number[] {
  return lines.map((l) => Math.round(l.quantity * l.unit_price_cents))
}

/** True when each unit price, line amount, subtotal, tax, and total survive the production currency format exactly. */
function statementHolds(lines: DraftLine[], taxRaw: string, currency: string): boolean {
  for (const l of lines) {
    if (!Number.isSafeInteger(l.unit_price_cents) || !centsHold(BigInt(l.unit_price_cents), currency)) return false
  }
  const amounts = lineAmounts(lines)
  let sub = BigInt(0)
  for (const a of amounts) {
    if (!Number.isSafeInteger(a)) return false
    const b = BigInt(a)
    if (!centsHold(b, currency)) return false
    sub += b
  }
  if (!centsHold(sub, currency)) return false
  const { num, den } = taxRatio(taxRaw)
  const tax = num === BigInt(0) ? BigInt(0) : roundDiv(sub * num, den)
  const total = sub + tax
  if (!centsHold(tax, currency) || !centsHold(total, currency)) return false
  const t = totals(amounts.map((a) => ({ quantity: 1, unit_price_cents: a })), taxRateOf(taxRaw))
  return t.subtotal === Number(sub) && t.tax === Number(tax) && t.total === Number(total)
}

/** Messages only when a number cannot be totaled. A negative price is a finite credit, not an error. */
export function freeInvoiceProblems(f: FreeInvoiceForm): string[] {
  const out: string[] = []
  f.lines.forEach((l, i) => {
    if (!lineActive(l)) return
    const q = parseNum(l.quantity)
    const p = parseNum(l.price)
    if (q.kind === 'bad') out.push(`Line ${i + 1}: quantity is not a usable number.`)
    if (p.kind === 'bad') out.push(`Line ${i + 1}: price is not a usable number.`)
    if (q.kind !== 'bad' && p.kind !== 'bad') {
      const qn = q.kind === 'ok' ? q.n : 0
      const pn = p.kind === 'ok' ? p.n : 0
      if (lineCents(qn, pn) == null) out.push(`Line ${i + 1}: that quantity and price are too large to total.`)
    }
  })
  if (parseNum(f.taxRate).kind === 'bad') out.push('Tax is not a usable number.')
  if (!statementHolds(draftLines(f), f.taxRate, currencyOf(f.currency))) out.push(TOO_LARGE)
  return out
}

export const freeInvoiceReady = (f: FreeInvoiceForm) => freeInvoiceProblems(f).length === 0

/** Map the free form to the preview/PDF shape. Non-finite lines and totals that cannot be shown exactly are left out. A negative price is kept. */
export function toPreviewData(f: FreeInvoiceForm): PreviewData {
  const lines = draftLines(f)
  const currency = currencyOf(f.currency)
  const hold = statementHolds(lines, f.taxRate, currency)
  return {
    number: f.number.trim() || 'INV-0001', issue_date: f.issueDate, due_date: f.dueDate,
    currency, tax_rate: hold ? taxRateOf(f.taxRate) : null, notes: f.notes.trim() || null,
    seller_name: f.fromName.trim(), seller_email: f.fromEmail.trim() || null, seller_address: f.fromAddress.trim() || null,
    client_name: f.toName.trim(), client_email: f.toEmail.trim() || null, client_address: f.toAddress.trim() || null,
    lines: hold ? lines : [],
  }
}

export const pdfFileName = (number: string) => `invoice-${(number || 'invoice').replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`
