import { NextResponse } from 'next/server'
import { ttGuard, bad } from '@/lib/time/guard'
import { ENTRY_COLS, addDays, invoiceable, isUuid, localDate, toInvoiceLines, type Entry, type Project, type Settings } from '@/lib/time/core'
import { nextInvoiceNumber } from '@/lib/proposals/core'

/** Unbilled, billable time for ONE client → a NEW unpaid invoice in the Invoices tool (inv_invoices / inv_invoice_lines).
 * mode 'project' = one line per project, 'entry' = one line per entry. Entries get invoice_id; deleting the invoice
 * sets it back to null (FK on delete set null), so they show as unbilled again. Never sends anything. */
export async function POST(req: Request) {
  const g = await ttGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  if (!isUuid(b?.client_id)) return bad('Pick a client.')
  const mode = b?.mode === 'entry' ? 'entry' : 'project'
  const { data: c } = await g.db.from('tt_clients').select('id, name, email').eq('id', b.client_id).maybeSingle()
  if (!c) return bad('Client not found.', 404)
  const [{ data: ps }, { data: st }] = await Promise.all([
    g.db.from('tt_projects').select('id, client_id, name, hourly_rate_cents, billable, archived').eq('client_id', c.id),
    g.db.from('tt_settings').select('default_rate_cents, currency').maybeSingle(),
  ])
  const projects = (ps || []) as Project[]
  const settings = (st || { default_rate_cents: null, currency: 'USD' }) as Settings
  if (!projects.length) return bad('Nothing unbilled for this client.')
  let q = g.db.from('tt_entries').select(ENTRY_COLS).in('project_id', projects.map((p) => p.id)).is('invoice_id', null).not('seconds', 'is', null).eq('billable', true)
  if (Array.isArray(b?.entry_ids)) {
    const ids = b.entry_ids.filter(isUuid).slice(0, 1000)
    if (!ids.length) return bad('Pick some time to invoice.')
    q = q.in('id', ids)
  }
  const ready = invoiceable(((await q).data || []) as Entry[])
  if (!ready.length) return bad('Nothing unbilled for this client.')
  const lines = toInvoiceLines(ready, projects, settings, mode)
  if (lines.some((l) => !l.unit_price_cents)) return bad('Set an hourly rate (on the project or as your default in Settings) before invoicing.')
  const noInv = 'Creating invoices needs Invoices (or All Access) on your plan.'
  const [{ data: prof }, { count }] = await Promise.all([
    g.db.from('inv_profiles').select('business_name, business_email, business_address, pay_link').maybeSingle(),
    g.db.from('inv_invoices').select('id', { count: 'exact', head: true }),
  ])
  const today = localDate()
  const dates = ready.map((e) => e.entry_date).sort()
  let invId: string | null = null
  for (let attempt = 0; attempt < 5 && !invId; attempt++) {
    const { data, error } = await g.db.from('inv_invoices').insert({
      user_id: g.user.id, number: nextInvoiceNumber(count || 0, attempt), issue_date: today, due_date: addDays(today, 14),
      client_name: c.name, client_email: c.email, seller_name: prof?.business_name || '', seller_email: prof?.business_email || '',
      seller_address: prof?.business_address || '', currency: settings.currency, pay_link: prof?.pay_link || null,
      notes: `Time from ${dates[0]} to ${dates[dates.length - 1]}.`,
    }).select('id').single()
    if (data) invId = data.id
    else if (error?.code !== '23505') return bad(error?.code === '42501' ? noInv : 'Could not create the invoice.')
  }
  if (!invId) return bad('Could not pick an invoice number, try again.')
  const { error: le } = await g.db.from('inv_invoice_lines').insert(lines.map((l) => ({ ...l, invoice_id: invId, user_id: g.user.id })))
  if (le) { await g.db.from('inv_invoices').delete().eq('id', invId); return bad(le.code === '42501' ? noInv : 'Could not add the lines to the invoice.') }
  const { error: ue } = await g.db.from('tt_entries').update({ invoice_id: invId, invoiced_at: new Date().toISOString() }).in('id', ready.map((e) => e.id)).is('invoice_id', null)
  if (ue) return bad('The invoice was created, but marking the time as billed failed. Check Invoices before trying again.')
  return NextResponse.json({ invoice_id: invId, lines: lines.length, entries: ready.length })
}
