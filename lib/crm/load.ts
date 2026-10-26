// Server-side loader. Every query runs with the signed-in user's session and an explicit user_id filter,
// so existing owner RLS on each source table limits results to the caller's own data.
import { createServerClient } from '@/lib/supabase'
import { totals } from '@/lib/invoices/core'
import { aggregate, formContact, normEmail, type Activity, type Contact, type OwnContact } from './core'

const LIMIT = 2000
type Db = any

export async function loadActivities(db: Db, uid: string, email?: string): Promise<Activity[]> {
  const out: Activity[] = []
  const byEmail = (q: any, col = 'email') => (email ? q.ilike(col, email.replace(/[\\%_]/g, (m) => '\\' + m)) : q)

  const [funnels, forms] = await Promise.all([
    db.from('funnels').select('id, name').eq('user_id', uid).limit(LIMIT),
    db.from('frm_forms').select('id, title, fields').eq('user_id', uid).limit(LIMIT),
  ])
  const funnelIds = (funnels.data || []).map((f: any) => f.id)
  const funnelName = new Map((funnels.data || []).map((f: any) => [f.id, f.name]))
  const formById = new Map((forms.data || []).map((f: any) => [f.id, f]))

  const [leads, responses, bookings, proposals, invoices] = await Promise.all([
    funnelIds.length ? byEmail(db.from('fm_leads').select('id, funnel_id, name, email, phone, message, created_at').in('funnel_id', funnelIds)).order('created_at', { ascending: false }).limit(LIMIT) : { data: [] },
    db.from('frm_responses').select('id, form_id, data, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(LIMIT),
    byEmail(db.from('bk_bookings').select('id, name, email, starts_at, status, created_at').eq('user_id', uid)).order('created_at', { ascending: false }).limit(LIMIT),
    byEmail(db.from('prp_proposals').select('id, title, client_name, client_email, status, created_at, updated_at').eq('user_id', uid), 'client_email').order('created_at', { ascending: false }).limit(LIMIT),
    byEmail(db.from('inv_invoices').select('id, number, client_name, client_email, status, currency, tax_rate, paid_at, issue_date, created_at, inv_invoice_lines(quantity, unit_price_cents)').eq('user_id', uid), 'client_email').order('created_at', { ascending: false }).limit(LIMIT),
  ])

  for (const l of leads.data || []) out.push({ source: 'form', id: l.id, email: l.email, name: l.name, phone: l.phone, at: l.created_at, title: `Funnel lead · ${funnelName.get(l.funnel_id) || 'Funnel'}`, href: `/funnels/${l.funnel_id}/analytics`, detail: l.message })
  for (const r of responses.data || []) {
    const form: any = formById.get(r.form_id); if (!form) continue
    const c = formContact(Array.isArray(form.fields) ? form.fields : [], r.data)
    if (!c.email || (email && c.email !== email)) continue
    out.push({ source: 'form', id: r.id, email: c.email, name: c.name, phone: c.phone, at: r.created_at, title: `Form · ${form.title}`, href: `/forms/${form.id}` })
  }
  for (const b of bookings.data || []) out.push({ source: 'booking', id: b.id, email: b.email, name: b.name, at: b.created_at, title: `Booking${b.status === 'cancelled' ? ' (cancelled)' : ''}`, href: '/booking', detail: b.starts_at ? `Call on ${new Date(b.starts_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Chicago' })} CT` : null })
  for (const p of proposals.data || []) if (p.client_email) out.push({ source: 'proposal', id: p.id, email: p.client_email, name: p.client_name, at: p.updated_at || p.created_at, title: `Proposal · ${p.title} (${p.status})`, href: `/proposals/${p.id}` })
  for (const i of invoices.data || []) {
    if (!i.client_email) continue
    const { total } = totals(i.inv_invoice_lines || [], i.tax_rate)
    out.push({ source: 'invoice', id: i.id, email: i.client_email, name: i.client_name, at: i.paid_at || i.created_at, title: `Invoice ${i.number} (${i.status})`, href: `/invoices/${i.id}`,
      amountCents: total, currency: i.currency || 'USD', paid: i.status === 'paid' })
  }
  return email ? out.filter((a) => normEmail(a.email) === email) : out
}

export async function loadContacts(uid: string): Promise<Contact[]> {
  const db: Db = await createServerClient()
  const [acts, own] = await Promise.all([loadActivities(db, uid), db.from('crm_contacts').select('*').eq('user_id', uid).limit(5000)])
  return aggregate(acts, (own.data || []) as OwnContact[])
}

export async function loadContact(uid: string, email: string) {
  const db: Db = await createServerClient()
  const [acts, own, notes] = await Promise.all([
    loadActivities(db, uid, email),
    db.from('crm_contacts').select('*').eq('user_id', uid).eq('email', email).maybeSingle(),
    db.from('crm_notes').select('id, body, created_at, updated_at').eq('user_id', uid).eq('email', email).order('created_at', { ascending: false }),
  ])
  const contact = aggregate(acts, own.data ? [own.data] : [])[0] || null
  return { contact, activities: acts.sort((a, b) => (a.at < b.at ? 1 : -1)), notes: (notes.data || []) as Note[] }
}
export type Note = { id: string; body: string; created_at: string; updated_at: string }
