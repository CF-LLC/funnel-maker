// Server-only. Today panel (workspace_v2): read-only counts from the signed-in user's own rows.
// Every query uses the user's session (owner RLS), an explicit user_id filter and a row limit.
// A failing tool query drops only that tool's row, never the panel.
import { totals, todayISO } from '@/lib/invoices/core'
import type { TodayCounts, TodayTool } from './today-core'

const LIMIT = 1000
const ok = (r: any) => { if (r?.error) throw new Error(r.error.message || 'query failed'); return r }
const cnt = (r: any) => (typeof r?.count === 'number' ? r.count : 0)

export async function loadToday(db: any, uid: string, tools: ReadonlySet<string>, now = new Date()): Promise<TodayCounts> {
  const today = todayISO(now)
  const since7 = new Date(now.getTime() - 7 * 86400_000).toISOString()
  const in48 = new Date(now.getTime() + 48 * 3600_000).toISOString()
  const head = { count: 'exact' as const, head: true }
  const out: TodayCounts = {}

  const jobs: Partial<Record<TodayTool, () => Promise<void>>> = {
    async invoices() {
      const r = ok(await db.from('inv_invoices').select('id, currency, tax_rate, inv_invoice_lines(quantity, unit_price_cents)').eq('user_id', uid).eq('status', 'unpaid').lt('due_date', today).limit(LIMIT))
      const by: Record<string, number> = {}
      for (const i of r.data || []) {
        const t = totals((i.inv_invoice_lines || []).map((l: any) => ({ quantity: Number(l.quantity), unit_price_cents: Number(l.unit_price_cents) })), i.tax_rate == null ? null : Number(i.tax_rate)).total
        by[i.currency || 'USD'] = (by[i.currency || 'USD'] || 0) + t
      }
      out.overdue = { count: (r.data || []).length, byCurrency: by }
    },
    async proposals() {
      // 'expired' is computed from expires_on (never stored): an expired proposal is not waiting.
      const r = ok(await db.from('prp_proposals').select('id, expires_on').eq('user_id', uid).eq('status', 'sent').limit(LIMIT))
      out.proposalsSent = (r.data || []).filter((p: any) => !p.expires_on || p.expires_on >= today).length
    },
    async booking() {
      out.bookingsSoon = cnt(ok(await db.from('bk_bookings').select('id', head).eq('user_id', uid).eq('status', 'confirmed').gte('starts_at', now.toISOString()).lt('starts_at', in48)))
    },
    async approvals() {
      // Item status = its latest version's status; "changes" = the client asked for changes.
      const [it, v] = await Promise.all([
        db.from('ap_items').select('id').eq('user_id', uid).eq('revoked', false).limit(LIMIT),
        db.from('ap_versions').select('item_id, number, status').eq('user_id', uid).limit(LIMIT),
      ]).then((rs) => rs.map(ok))
      const live = new Set((it.data || []).map((r: any) => r.id))
      const latest = new Map<string, { number: number; status: string }>()
      for (const x of v.data || []) { const p = latest.get(x.item_id); if (!p || x.number > p.number) latest.set(x.item_id, x) }
      out.approvalChanges = [...latest].filter(([id, x]) => live.has(id) && x.status === 'changes').length
    },
    async changelog() {
      out.changesReady = cnt(ok(await db.from('cl_requests').select('id', head).eq('user_id', uid).eq('status', 'approved').is('invoice_id', null)))
    },
    async funnels() {
      const f = ok(await db.from('funnels').select('id').eq('user_id', uid).limit(LIMIT))
      const ids = (f.data || []).map((r: any) => r.id)
      out.leads7d = ids.length ? cnt(ok(await db.from('fm_leads').select('id', head).in('funnel_id', ids).gte('created_at', since7))) : 0
    },
    async forms() {
      out.responses7d = cnt(ok(await db.from('frm_responses').select('id', head).eq('user_id', uid).gte('created_at', since7)))
    },
    async time() {
      const r = ok(await db.from('tt_entries').select('id, seconds').eq('user_id', uid).eq('billable', true).is('invoice_id', null).not('seconds', 'is', null).limit(LIMIT))
      const rows = r.data || []
      out.unbilledTimeEntries = rows.length
      out.unbilledSeconds = rows.reduce((a: number, x: any) => a + Number(x.seconds || 0), 0)
    },
    async expenses() {
      const r = ok(await db.from('ex_expenses').select('id, amount_cents').eq('user_id', uid).eq('billable', true).is('invoice_id', null).limit(LIMIT))
      const rows = r.data || []
      out.unbilledExpenses = { count: rows.length, cents: rows.reduce((a: number, x: any) => a + Number(x.amount_cents || 0), 0) }
    },
  }
  await Promise.all(Object.entries(jobs).filter(([t]) => tools.has(t)).map(([t, run]) => run!().catch((e: any) => console.error('[today]', t, e?.message))))
  return out
}
