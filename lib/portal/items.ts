// Turns shared refs into read-only display items. `db` is either the owner's session client (RLS) or the service role
// client scoped by user_id; both only ever read the owner's existing Invoices/Proposals/Booking rows.
import { totals } from '@/lib/invoices/core'
import type { Kind } from './core'

export type Item = { kind: Kind; id: string; title: string; sub: string; status: string; amount: string | null; href: string | null; date: string | null }
const fmt = (c: number, cur: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur || 'USD' }).format(c / 100)

export async function loadItems(db: any, userId: string, refs: { kind: Kind; ref_id: string }[], publicOnly: boolean): Promise<Item[]> {
  const ids = (k: Kind) => refs.filter((r) => r.kind === k).map((r) => r.ref_id)
  const inv = ids('invoice'), prp = ids('proposal'), bk = ids('booking')
  const none = { data: [] as any[] }
  const [invR, linesR, prpR, bkR, profR] = await Promise.all([
    inv.length ? db.from('inv_invoices').select('id, number, due_date, status, currency, tax_rate, public_token, client_name').eq('user_id', userId).in('id', inv) : none,
    inv.length ? db.from('inv_invoice_lines').select('invoice_id, quantity, unit_price_cents').in('invoice_id', inv) : none,
    prp.length ? db.from('prp_proposals').select('id, title, status, expires_on, currency, client_name').eq('user_id', userId).in('id', prp) : none,
    bk.length ? db.from('bk_bookings').select('id, starts_at, status, type_id, booker_tz').eq('user_id', userId).in('id', bk) : none,
    prp.length ? db.from('lib_profiles').select('handle').eq('user_id', userId).maybeSingle() : { data: null },
  ])
  const typeIds = [...new Set((bkR.data || []).map((b: any) => b.type_id).filter(Boolean))]
  const types = typeIds.length ? (await db.from('bk_types').select('id, name').in('id', typeIds)).data || [] : []
  const typeName = new Map(types.map((t: any) => [t.id, t.name]))
  const out: Item[] = []
  for (const i of invR.data || []) {
    if (publicOnly && i.status === 'draft') continue
    const t = totals((linesR.data || []).filter((l: any) => l.invoice_id === i.id), i.tax_rate)
    out.push({ kind: 'invoice', id: i.id, title: `Invoice ${i.number}`, sub: `Due ${i.due_date}`, status: i.status, amount: fmt(t.total, i.currency), href: i.public_token ? `/i/${i.public_token}` : null, date: i.due_date })
  }
  for (const p of prpR.data || []) {
    if (publicOnly && p.status === 'draft') continue
    const handle = profR.data?.handle
    out.push({ kind: 'proposal', id: p.id, title: p.title, sub: p.expires_on ? `Valid until ${p.expires_on}` : 'Proposal', status: p.status, amount: null, href: handle && p.status !== 'draft' ? `/@${handle}/p/${p.id}` : null, date: p.expires_on })
  }
  for (const b of bkR.data || []) {
    const tz = b.booker_tz || 'UTC'
    let when = b.starts_at
    try { when = new Date(b.starts_at).toLocaleString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }) } catch {}
    out.push({ kind: 'booking', id: b.id, title: String(typeName.get(b.type_id) || 'Call'), sub: when, status: b.status, amount: null, href: null, date: b.starts_at })
  }
  return out
}
