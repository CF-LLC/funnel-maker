// Server-only. Setup checklist (workspace_v2): read-only "does at least one row exist" checks on the user's own rows.
// Owner RLS + explicit user_id filter + head counts (no row data). A failing query = that step stays not done.
import type { SetupFacts } from './setup-core'

const head = { count: 'exact' as const, head: true }
const any = (r: any) => { if (r?.error) throw new Error(r.error.message || 'query failed'); return typeof r?.count === 'number' && r.count > 0 }
const safe = (p: () => Promise<boolean>) => p().catch((e: any) => { console.error('[setup]', e?.message); return false })

export async function loadSetup(db: any, uid: string, tools: ReadonlySet<string>): Promise<SetupFacts> {
  const t = (id: string, p: () => Promise<boolean>) => (tools.has(id) ? safe(p) : Promise.resolve(false))
  const [crm, invClient, prp, inv, fun, frm, bk, paidInv, payLink] = await Promise.all([
    t('crm', async () => any(await db.from('crm_contacts').select('email', head).eq('user_id', uid))),
    t('invoices', async () => any(await db.from('inv_clients').select('id', head).eq('user_id', uid).not('email', 'is', null))),
    t('proposals', async () => any(await db.from('prp_proposals').select('id', head).eq('user_id', uid))),
    t('invoices', async () => any(await db.from('inv_invoices').select('id', head).eq('user_id', uid))),
    t('funnels', async () => any(await db.from('funnels').select('id', head).eq('user_id', uid).eq('is_public', true))),
    t('forms', async () => any(await db.from('frm_forms').select('id', head).eq('user_id', uid).eq('published', true))),
    t('booking', async () => any(await db.from('bk_types').select('id', head).eq('user_id', uid).eq('active', true))),
    t('invoices', async () => any(await db.from('inv_invoices').select('id', head).eq('user_id', uid).eq('status', 'paid'))),
    t('invoices', async () => any(await db.from('inv_profiles').select('user_id', head).eq('user_id', uid).not('pay_link', 'is', null))),
  ])
  return { client: crm || invClient, sent: prp || inv, shared: fun || frm || bk, paid: paidInv || payLink }
}
