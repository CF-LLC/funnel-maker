import { totals } from '@/lib/invoices/core'
import type { OpenInvoice } from './core'

export type MatchRow = { id: string; invoice_id: string; amount_cents: number; paid_on: string; confidence: string; payer: string | null; note: string | null; created_at: string; number?: string; client_name?: string }

/** The owner's unpaid invoices with totals (owner RLS on the session client). */
export async function openInvoices(db: any): Promise<OpenInvoice[]> {
  const { data, error } = await db.from('inv_invoices')
    .select('id, number, client_name, due_date, issue_date, currency, tax_rate, inv_invoice_lines(quantity, unit_price_cents)')
    .eq('status', 'unpaid').order('due_date', { ascending: true }).limit(1000)
  if (error) throw error
  return (data || []).map((r: any) => ({
    id: r.id, number: r.number, client_name: r.client_name, due_date: r.due_date, issue_date: r.issue_date, currency: r.currency,
    total: totals((r.inv_invoice_lines || []).map((l: any) => ({ quantity: Number(l.quantity), unit_price_cents: Number(l.unit_price_cents) })), r.tax_rate === null ? null : Number(r.tax_rate)).total,
  }))
}
export async function recentMatches(db: any): Promise<MatchRow[]> {
  const { data } = await db.from('pd_matches').select('id, invoice_id, amount_cents, paid_on, confidence, payer, note, created_at, inv_invoices(number, client_name)')
    .is('undone_at', null).order('created_at', { ascending: false }).limit(50)
  return (data || []).map((r: any) => ({ ...r, amount_cents: Number(r.amount_cents), number: r.inv_invoices?.number, client_name: r.inv_invoices?.client_name, inv_invoices: undefined }))
}
