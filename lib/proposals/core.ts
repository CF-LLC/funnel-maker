// Proposals (tool #5). Pure logic shared by the editor, public page, API and tests.
import { z } from 'zod'
import { lineSchema, toCents, todayISO, addDaysISO } from '@/lib/invoices/core'

export const STORED_STATUSES = ['draft', 'sent', 'accepted', 'declined'] as const
export const STATUSES = [...STORED_STATUSES, 'expired'] as const
export type StoredStatus = (typeof STORED_STATUSES)[number]
export type Status = (typeof STATUSES)[number]
export const STATUS_LABELS: Record<Status, string> = { draft: 'Draft', sent: 'Sent', accepted: 'Accepted', declined: 'Declined', expired: 'Expired' }
export const STATUS_STYLES: Record<Status, string> = {
  draft: 'bg-muted text-muted-foreground', sent: 'bg-blue-100 text-blue-800', accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800', expired: 'bg-amber-100 text-amber-900',
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const proposalSchema = z.object({
  clientId: z.string().uuid('Pick a saved client'),
  title: z.string().trim().min(1, 'Title is required').max(150),
  intro: z.string().trim().max(2000, 'Intro is too long (2000 max)'),
  currency: z.string().trim().length(3, 'Use a 3-letter code like USD').transform((v) => v.toUpperCase()),
  expiresOn: z.string().regex(DATE_RE, 'Pick a valid expiry date').or(z.literal('')),
  lines: z.array(lineSchema).min(1, 'At least one item is required').max(100),
})
export type ProposalInput = z.input<typeof proposalSchema>

/** Today in the business timezone (America/Chicago), as YYYY-MM-DD. */
export function todayChicago(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

/** Expired = sent, not answered, and the expiry date has passed (the expiry day itself is still valid). */
export function effectiveStatus(p: { status: string; expires_on: string | null }, today = todayChicago()): Status {
  if (p.status === 'sent' && p.expires_on && p.expires_on < today) return 'expired'
  return (STORED_STATUSES as readonly string[]).includes(p.status) ? (p.status as Status) : 'draft'
}
export const canRespond = (p: { status: string; expires_on: string | null }, today = todayChicago()) => effectiveStatus(p, today) === 'sent'

export const respondSchema = z.object({
  handle: z.string().max(40),
  id: z.string().regex(UUID_RE),
  action: z.enum(['accept', 'decline']),
  name: z.string().trim().max(200).optional(),
}).refine((v) => v.action !== 'accept' || (v.name?.length ?? 0) >= 2, { message: 'Type your full name to accept', path: ['name'] })

export const publicProposalPath = (handle: string, id: string) => `/@${handle}/p/${id}`

export function lineRows(lines: { description: string; quantity: number; price: number }[]) {
  return lines.map((l, i) => ({ position: i, description: l.description, quantity: l.quantity, unit_price_cents: toCents(l.price) }))
}

type P = { id: string; client_id: string | null; client_name: string; client_email: string | null; client_address: string | null; title: string; currency: string; accepted_name: string | null; responded_at: string | null }
type Prof = { business_name?: string; business_email?: string; business_address?: string; pay_link?: string | null } | null

/** Invoice + lines for converting an accepted proposal (same client and items). */
export function proposalToInvoice(p: P, lines: { position: number; description: string; quantity: number | string; unit_price_cents: number | string }[], profile: Prof, number: string, today = todayISO()) {
  const accepted = p.responded_at ? p.responded_at.slice(0, 10) : today
  const invoice = {
    number, issue_date: today, due_date: addDaysISO(today, 14), client_id: p.client_id, client_name: p.client_name, client_email: p.client_email,
    client_address: p.client_address, seller_name: profile?.business_name || '', seller_email: profile?.business_email || '',
    seller_address: profile?.business_address || '', currency: p.currency, tax_rate: null, pay_link: profile?.pay_link || null,
    notes: `From proposal "${p.title}", accepted by ${p.accepted_name || p.client_name} on ${accepted}.`.slice(0, 2000),
  }
  const invLines = [...lines].sort((a, b) => a.position - b.position)
    .map((l, i) => ({ position: i, description: l.description, quantity: Number(l.quantity), unit_price_cents: Number(l.unit_price_cents) }))
  return { invoice, lines: invLines }
}

export const nextInvoiceNumber = (count: number, attempt = 0) => `INV-${String(count + 1 + attempt).padStart(4, '0')}`
