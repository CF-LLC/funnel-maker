import { addDaysISO, todayISO } from '@/lib/invoices/core'
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

/** Same bounds as the paid invoice form (lib/invoices/core.ts lineSchema / taxRate). */
const QTY_MAX = 1_000_000
const PRICE_MAX = 10_000_000

type Parsed = { kind: 'blank' } | { kind: 'bad' } | { kind: 'ok'; n: number }

/** Blank stays blank. Only a plain decimal is a number; 1e308 and other non-finite text are rejected. */
function parseNum(raw: string): Parsed {
  const s = String(raw ?? '').trim().replace(/,/g, '')
  if (!s) return { kind: 'blank' }
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) return { kind: 'bad' }
  const n = Number(s)
  return Number.isFinite(n) ? { kind: 'ok', n } : { kind: 'bad' }
}

function lineAmount(qty: number, price: number): number | null {
  const cents = Math.round(price * 100)
  const amount = Math.round(qty * cents)
  if (!Number.isSafeInteger(cents) || cents < 0) return null
  if (!Number.isSafeInteger(amount) || amount < 0) return null
  return amount
}

function lineActive(l: FreeInvoiceForm['lines'][number]): boolean {
  const q = parseNum(l.quantity)
  const p = parseNum(l.price)
  if (q.kind === 'bad' || p.kind === 'bad') return true
  if (l.description.trim()) return true
  if (p.kind === 'ok' && p.n !== 0) return true
  if (q.kind === 'ok' && (q.n < 0 || q.n > QTY_MAX)) return true
  return false
}

/** Plain messages for values the paid invoice form already rejects. Blank fields are not errors. */
export function freeInvoiceProblems(f: FreeInvoiceForm): string[] {
  const out: string[] = []
  f.lines.forEach((l, i) => {
    if (!lineActive(l)) return
    const q = parseNum(l.quantity)
    const p = parseNum(l.price)
    if (q.kind === 'bad' || (q.kind === 'ok' && (q.n < 0 || q.n > QTY_MAX))) out.push(`Line ${i + 1}: quantity must be from 0 to 1,000,000.`)
    if (p.kind === 'bad' || (p.kind === 'ok' && (p.n < 0 || p.n > PRICE_MAX))) out.push(`Line ${i + 1}: price must be from 0 to 10,000,000.`)
    else if (q.kind === 'ok' && p.kind === 'ok' && lineAmount(q.n, p.n) == null) out.push(`Line ${i + 1}: that quantity and price are too large to total.`)
  })
  const tax = parseNum(f.taxRate)
  if (tax.kind === 'bad' || (tax.kind === 'ok' && (tax.n < 0 || tax.n > 100))) out.push('Tax must be from 0 to 100.')
  return out
}

export const freeInvoiceReady = (f: FreeInvoiceForm) => freeInvoiceProblems(f).length === 0

/** Map the free form to the paid Invoices preview/PDF shape. Invalid numbers are left out, never turned into 0 or infinity. */
export function toPreviewData(f: FreeInvoiceForm): PreviewData {
  const tax = parseNum(f.taxRate)
  const taxRate = tax.kind === 'ok' && tax.n > 0 && tax.n <= 100 ? tax.n : null
  const lines = f.lines.flatMap((l) => {
    if (!lineActive(l)) return []
    const q = parseNum(l.quantity)
    const p = parseNum(l.price)
    if (q.kind === 'bad' || p.kind === 'bad') return []
    const qn = q.kind === 'ok' ? q.n : 0
    const pn = p.kind === 'ok' ? p.n : 0
    if (qn < 0 || qn > QTY_MAX || pn < 0 || pn > PRICE_MAX) return []
    const cents = Math.round(pn * 100)
    if (lineAmount(qn, pn) == null) return []
    return [{ description: l.description.trim(), quantity: qn, unit_price_cents: cents }]
  })
  return {
    number: f.number.trim() || 'INV-0001', issue_date: f.issueDate, due_date: f.dueDate,
    currency: (FREE_INVOICE_CURRENCIES as readonly string[]).includes(f.currency) ? f.currency : 'USD',
    tax_rate: taxRate, notes: f.notes.trim() || null,
    seller_name: f.fromName.trim(), seller_email: f.fromEmail.trim() || null, seller_address: f.fromAddress.trim() || null,
    client_name: f.toName.trim(), client_email: f.toEmail.trim() || null, client_address: f.toAddress.trim() || null,
    lines,
  }
}

export const pdfFileName = (number: string) => `invoice-${(number || 'invoice').replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`
