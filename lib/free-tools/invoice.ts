import { addDaysISO, todayISO, toCents } from '@/lib/invoices/core'
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

const num = (s: string) => { const n = Number(String(s).replace(/,/g, '')); return Number.isFinite(n) ? n : 0 }

/** Map the free form to the paid Invoices preview/PDF shape. Pure; nothing leaves the browser. */
export function toPreviewData(f: FreeInvoiceForm): PreviewData {
  const tax = Math.min(100, Math.max(0, num(f.taxRate)))
  return {
    number: f.number.trim() || 'INV-0001', issue_date: f.issueDate, due_date: f.dueDate,
    currency: (FREE_INVOICE_CURRENCIES as readonly string[]).includes(f.currency) ? f.currency : 'USD',
    tax_rate: tax || null, notes: f.notes.trim() || null,
    seller_name: f.fromName.trim(), seller_email: f.fromEmail.trim() || null, seller_address: f.fromAddress.trim() || null,
    client_name: f.toName.trim(), client_email: f.toEmail.trim() || null, client_address: f.toAddress.trim() || null,
    lines: f.lines
      .filter((l) => l.description.trim() || num(l.price))
      .map((l) => ({ description: l.description.trim(), quantity: Math.max(0, num(l.quantity)), unit_price_cents: toCents(num(l.price)) })),
  }
}

export const pdfFileName = (number: string) => `invoice-${(number || 'invoice').replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`
