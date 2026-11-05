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
  return out
}

export const freeInvoiceReady = (f: FreeInvoiceForm) => freeInvoiceProblems(f).length === 0

/** Map the free form to the preview/PDF shape. Non-finite lines are left out. A negative price is kept. */
export function toPreviewData(f: FreeInvoiceForm): PreviewData {
  const tax = parseNum(f.taxRate)
  const taxN = tax.kind === 'ok' ? Math.min(100, Math.max(0, tax.n)) : 0
  const taxRate = taxN || null
  const lines = f.lines.flatMap((l) => {
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
