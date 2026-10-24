// Shared invoice logic. Schema + currency formatting adapted from CF-LLC/InvoiceForge (invoice-form.tsx, lib/invoice-config.ts).
import { z } from 'zod'

export const PAY_LINK_RE = /^https:\/\/(buy\.stripe\.com|checkout\.stripe\.com)\//

export const lineSchema = z.object({
  description: z.string().trim().min(1, 'Description is required').max(500),
  quantity: z.coerce.number().positive('Quantity must be more than 0').max(1_000_000),
  price: z.coerce.number().min(0, 'Price must be at least 0').max(10_000_000),
})

const optEmail = z.string().trim().max(320).email('Invalid email').or(z.literal('')).optional()

export const invoiceSchema = z.object({
  number: z.string().trim().min(1, 'Invoice number is required').max(40),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date is required'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date is required'),
  clientId: z.string().uuid().nullable().optional(),
  clientName: z.string().trim().min(1, 'Client name is required').max(200),
  clientEmail: optEmail,
  clientAddress: z.string().max(1000).optional(),
  sellerName: z.string().max(200).optional(),
  sellerEmail: optEmail,
  sellerAddress: z.string().max(1000).optional(),
  currency: z.string().trim().length(3, 'Use a 3-letter code like USD').transform((v) => v.toUpperCase()),
  taxRate: z.union([z.literal(''), z.coerce.number().min(0, 'Tax rate must be at least 0').max(100, 'Tax rate cannot exceed 100')]).optional(),
  notes: z.string().max(2000).optional(),
  payLink: z.string().trim().regex(PAY_LINK_RE, 'Use a Stripe Payment Link (https://buy.stripe.com/...)').or(z.literal('')).optional(),
  lines: z.array(lineSchema).min(1, 'At least one item is required').max(100),
}).refine((v) => v.dueDate >= v.issueDate, { message: 'Due date must be on or after the issue date', path: ['dueDate'] })

export type InvoiceInput = z.input<typeof invoiceSchema>

export const toCents = (n: number) => Math.round(n * 100)
export const fromCents = (c: number) => c / 100

export type Line = { quantity: number; unit_price_cents: number }
export function totals(lines: Line[], taxRate: number | null | undefined) {
  const subtotal = lines.reduce((s, l) => s + Math.round(Number(l.quantity) * Number(l.unit_price_cents)), 0)
  const tax = taxRate ? Math.round((subtotal * Number(taxRate)) / 100) : 0
  return { subtotal, tax, total: subtotal + tax }
}

export function formatCurrency(cents: number, currency = 'USD', locale = 'en-US'): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100)
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`
  }
}

export function todayISO(d = new Date()) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}
export function addDaysISO(iso: string, days: number) {
  const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10)
}
export const isOverdue = (inv: { status: string; due_date: string }, today = todayISO()) => inv.status === 'unpaid' && inv.due_date < today

export function safePayLink(url: string | null | undefined): string | null {
  return url && PAY_LINK_RE.test(url) ? url : null
}

/** mailto: to the user's own address with the invoice link prefilled (they forward/send it themselves). */
export function reminderMailto(o: { to: string; number: string; clientName: string; amount: string; dueDate: string; link: string }) {
  const subject = `Reminder: invoice ${o.number} for ${o.clientName} due ${o.dueDate}`
  const body = `Invoice ${o.number} for ${o.clientName}\nAmount due: ${o.amount}\nDue: ${o.dueDate}\n\nInvoice link (forward to your client):\n${o.link}\n`
  return `mailto:${encodeURIComponent(o.to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

const icsEsc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
/** All-day calendar reminder on the due date. */
export function reminderIcs(o: { uid: string; number: string; clientName: string; amount: string; dueDate: string; link: string }) {
  const d = o.dueDate.replace(/-/g, '')
  const next = addDaysISO(o.dueDate, 1).replace(/-/g, '')
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SaaS Nation//Invoices//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${o.uid}@saasnation.site`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${next}`,
    `SUMMARY:${icsEsc(`Invoice ${o.number} due: ${o.clientName} (${o.amount})`)}`,
    `DESCRIPTION:${icsEsc(`Check payment for invoice ${o.number}. ${o.link}`)}`, `URL:${o.link}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-PT0M', `DESCRIPTION:${icsEsc(`Invoice ${o.number} due`)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n')
}
