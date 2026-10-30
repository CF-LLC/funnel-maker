import { NextResponse } from 'next/server'
import { exGuard, bad } from '@/lib/expenses/guard'
import { EXPENSE_COLS, billTo, cleanEmail, cleanText, invoiceable, isUuid, localDate, toInvoiceLines, type Expense } from '@/lib/expenses/core'
import { nextInvoiceNumber } from '@/lib/proposals/core'
import { loadProjects } from '@/lib/expenses/server'

/** Picked unbilled, billable expenses → a NEW unpaid invoice in Invoices (one line per expense). They get invoice_id;
 * deleting the invoice sets it back to null (FK on delete set null), so they're unbilled again. Never sends anything.
 * Bill-to: the expenses' linked client (all must match), else client_name/client_email from the body. */
export async function POST(req: Request) {
  const g = await exGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  const ids = Array.isArray(b?.expense_ids) ? b.expense_ids.filter(isUuid).slice(0, 500) : []
  if (!ids.length) return bad('Pick some expenses to invoice.')
  const [{ data: es }, { data: cats }, projects, { data: crm }] = await Promise.all([
    g.db.from('ex_expenses').select(EXPENSE_COLS).in('id', ids),
    g.db.from('ex_categories').select('id, name, archived'),
    loadProjects(g.db),
    g.db.from('crm_contacts').select('email, name, company').limit(5000),
  ])
  const ready = invoiceable((es || []) as Expense[])
  if (!ready.length) return bad('Nothing unbilled to invoice.')
  const tos = ready.map((e) => billTo(e, projects, crm || []))
  const keys = new Set(tos.map((t) => t?.key || 'none'))
  if (keys.size > 1) return bad('Those expenses are for different clients. Invoice one client at a time.')
  const to = tos[0]
  const clientName = to?.name || cleanText(b?.client_name, 120)
  const clientEmail = to?.email || (b?.client_email ? cleanEmail(b.client_email) : null)
  if (!clientName) return bad('Who is this invoice for? Add a client name.')
  const noInv = 'Creating invoices needs Invoices (or All Access) on your plan.'
  const [{ data: prof }, { count }] = await Promise.all([
    g.db.from('inv_profiles').select('business_name, business_email, business_address, pay_link').maybeSingle(),
    g.db.from('inv_invoices').select('id', { count: 'exact', head: true }),
  ])
  const today = localDate()
  const due = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10)
  const dates = ready.map((e) => e.expense_date).sort()
  let invId: string | null = null
  for (let attempt = 0; attempt < 5 && !invId; attempt++) {
    const { data, error } = await g.db.from('inv_invoices').insert({
      user_id: g.user.id, number: nextInvoiceNumber(count || 0, attempt), issue_date: today, due_date: due,
      client_name: clientName, client_email: clientEmail, seller_name: prof?.business_name || '', seller_email: prof?.business_email || '',
      seller_address: prof?.business_address || '', currency: 'USD', pay_link: prof?.pay_link || null,
      notes: `Expenses from ${dates[0]} to ${dates[dates.length - 1]}.`,
    }).select('id').single()
    if (data) invId = data.id
    else if (error?.code !== '23505') return bad(error?.code === '42501' ? noInv : 'Could not create the invoice.')
  }
  if (!invId) return bad('Could not pick an invoice number, try again.')
  const lines = toInvoiceLines(ready, cats || [])
  const { error: le } = await g.db.from('inv_invoice_lines').insert(lines.map((l) => ({ ...l, invoice_id: invId, user_id: g.user.id })))
  if (le) { await g.db.from('inv_invoices').delete().eq('id', invId); return bad(le.code === '42501' ? noInv : 'Could not add the lines to the invoice.') }
  const { error: ue } = await g.db.from('ex_expenses').update({ invoice_id: invId, invoiced_at: new Date().toISOString() }).in('id', ready.map((e) => e.id)).is('invoice_id', null)
  if (ue) return bad('The invoice was created, but marking the expenses as billed failed. Check Invoices before trying again.')
  return NextResponse.json({ invoice_id: invId, lines: lines.length, expenses: ready.length })
}
