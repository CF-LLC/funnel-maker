// Server-only. The signed-in user's results for a window, read with their own session (RLS: own rows only).
import type { DigestCounts } from '@/lib/digest'

export async function loadResults(supabase: any, userId: string, days = 30): Promise<DigestCounts> {
  const since = new Date(Date.now() - days * 86400_000).toISOString()
  const n = async (q: any) => { const { count, error } = await q; return error ? 0 : count ?? 0 }
  const head = (t: string) => supabase.from(t).select('*', { count: 'exact', head: true })
  const { data: f } = await supabase.from('funnels').select('id').eq('user_id', userId).limit(1000)
  const fids = (f ?? []).map((r: any) => r.id)
  const [leads, responses, bookings, invoicesPaid, reviews] = await Promise.all([
    fids.length ? n(head('fm_leads').in('funnel_id', fids).gte('created_at', since)) : 0,
    n(head('frm_responses').eq('user_id', userId).gte('created_at', since)),
    n(head('bk_bookings').eq('user_id', userId).gte('created_at', since)),
    n(head('inv_invoices').eq('user_id', userId).eq('status', 'paid').gte('updated_at', since)),
    n(head('tst_reviews').eq('user_id', userId).gte('created_at', since)),
  ])
  return { leads, responses, bookings, invoicesPaid, reviews }
}

/** Tables exported for "Download my data": every tool table that has a user_id column. Read with the user's session. */
export const EXPORT_TABLES: { table: string; col: string }[] = [
  { table: 'users', col: 'id' }, { table: 'app_access', col: 'user_id' }, { table: 'funnels', col: 'user_id' },
  { table: 'inv_invoices', col: 'user_id' }, { table: 'frm_forms', col: 'user_id' }, { table: 'frm_responses', col: 'user_id' },
  { table: 'prp_proposals', col: 'user_id' }, { table: 'tst_reviews', col: 'user_id' }, { table: 'bk_bookings', col: 'user_id' },
  { table: 'lib_profiles', col: 'user_id' }, { table: 'dr_profiles', col: 'user_id' }, { table: 'crm_contacts', col: 'user_id' },
  { table: 'el_subscribers', col: 'user_id' }, { table: 'dl_products', col: 'user_id' }, { table: 'organizations', col: 'owner_id' },
  { table: 'user_notification_prefs', col: 'user_id' },
]
