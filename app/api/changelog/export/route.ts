import { NextResponse } from 'next/server'
import { clGuard, bad } from '@/lib/changelog/guard'
import { REQ_COLS, isUuid, toInvoiceLines, type Req } from '@/lib/changelog/core'
import { nextInvoiceNumber } from '@/lib/proposals/core'

const addDays = (iso: string, d: number) => new Date(Date.parse(iso) + d * 86_400_000).toISOString().slice(0, 10)
/** Approved, not-yet-invoiced extras → lines on a NEW unpaid invoice or appended to an existing UNPAID one (Invoices tool). */
export async function POST(req: Request) {
  const g = await clGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  if (!isUuid(b?.project_id)) return bad('Not found.', 404)
  const { data: p } = await g.db.from('cl_projects').select('id, title, client_name, client_email, currency, hourly_rate_cents').eq('id', b.project_id).maybeSingle()
  if (!p) return bad('Not found.', 404)
  const { data: reqs } = await g.db.from('cl_requests').select(REQ_COLS).eq('project_id', p.id).eq('status', 'approved').is('invoice_id', null).order('created_at')
  const ready = (reqs || []) as Req[]
  if (!ready.length) return bad('Nothing approved is waiting to be invoiced.')
  if (ready.some((r) => r.est_kind === 'hours') && !p.hourly_rate_cents) return bad('Set an hourly rate on this project first, so hours can be priced.')
  const noInv = 'Exporting needs Invoices (or All Access) on your plan.'
  let invId: string
  let start = 0
  if (b?.invoice_id) {
    if (!isUuid(b.invoice_id)) return bad('Pick an invoice.')
    const { data: inv } = await g.db.from('inv_invoices').select('id, status, currency').eq('id', b.invoice_id).maybeSingle()
    if (!inv) return bad('Invoice not found.', 404)
    if (inv.status !== 'unpaid') return bad('Only unpaid invoices can get new lines.')
    if (inv.currency !== p.currency) return bad(`That invoice is in ${inv.currency}; this project is in ${p.currency}.`)
    const { data: last } = await g.db.from('inv_invoice_lines').select('position').eq('invoice_id', inv.id).order('position', { ascending: false }).limit(1)
    start = last?.length ? Number(last[0].position) + 1 : 0
    invId = inv.id
  } else {
    const [{ data: prof }, { count }] = await Promise.all([
      g.db.from('inv_profiles').select('business_name, business_email, business_address, pay_link').maybeSingle(),
      g.db.from('inv_invoices').select('id', { count: 'exact', head: true }),
    ])
    const today = new Date().toISOString().slice(0, 10)
    let id: string | null = null
    for (let attempt = 0; attempt < 5 && !id; attempt++) {
      const { data, error } = await g.db.from('inv_invoices').insert({
        user_id: g.user.id, number: nextInvoiceNumber(count || 0, attempt), issue_date: today, due_date: addDays(today, 14),
        client_name: p.client_name, client_email: p.client_email, seller_name: prof?.business_name || '', seller_email: prof?.business_email || '',
        seller_address: prof?.business_address || '', currency: p.currency, pay_link: prof?.pay_link || null,
        notes: `Approved extras for "${p.title}".`.slice(0, 2000),
      }).select('id').single()
      if (data) id = data.id
      else if (error?.code !== '23505') return bad(error?.code === '42501' ? noInv : 'Could not create the invoice.')
    }
    if (!id) return bad('Could not pick an invoice number, try again.')
    invId = id
  }
  const lines = toInvoiceLines(ready, p.hourly_rate_cents, start).map((l) => ({ ...l, invoice_id: invId, user_id: g.user.id }))
  const { error: le } = await g.db.from('inv_invoice_lines').insert(lines)
  if (le) return bad(le.code === '42501' ? noInv : 'Could not add the lines to the invoice.')
  const { error: ue } = await g.db.from('cl_requests').update({ invoice_id: invId, invoiced_at: new Date().toISOString(), updated_at: new Date().toISOString() }).in('id', ready.map((r) => r.id))
  if (ue) return bad('Lines were added, but marking the requests as invoiced failed. Check the invoice before exporting again.')
  return NextResponse.json({ invoice_id: invId, lines: lines.length })
}
