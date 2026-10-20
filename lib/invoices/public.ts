import { serviceClient } from '@/lib/server/admin-client'

export type PublicInvoice = {
  number: string; issue_date: string; due_date: string; status: string; currency: string; tax_rate: number | null; notes: string | null
  client_name: string; client_email: string | null; client_address: string | null
  seller_name: string; seller_email: string; seller_address: string; pay_link: string | null
  lines: { description: string; quantity: number; unit_price_cents: number }[]
}

/** Read-only projection by unguessable token (service role; never exposes ids or user_id). */
export async function getPublicInvoice(token: string): Promise<PublicInvoice | null> {
  if (!/^[0-9a-f]{48}$/.test(token)) return null
  const db = serviceClient()
  const { data: inv } = await db.from('inv_invoices')
    .select('id, number, issue_date, due_date, status, currency, tax_rate, notes, client_name, client_email, client_address, seller_name, seller_email, seller_address, pay_link')
    .eq('public_token', token).maybeSingle()
  if (!inv) return null
  const { data: lines } = await db.from('inv_invoice_lines').select('description, quantity, unit_price_cents').eq('invoice_id', inv.id).order('position')
  const { id: _id, ...rest } = inv as any
  return { ...rest, tax_rate: rest.tax_rate === null ? null : Number(rest.tax_rate), lines: (lines || []).map((l: any) => ({ ...l, quantity: Number(l.quantity), unit_price_cents: Number(l.unit_price_cents) })) }
}
