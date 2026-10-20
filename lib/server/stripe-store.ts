import { serviceClient } from '@/lib/server/admin-client'
import { foundingOpen } from '@/lib/server/access-admin'
import type { Store, Grant } from '@/lib/stripe-webhook'

/** Supabase-backed store for the Stripe webhook (service role). */
export function supabaseStore(): Store {
  const db = serviceClient()
  const must = <T extends { error: any }>(r: T, what: string) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r }
  return {
    async eventProcessed(id) {
      const { data } = must(await db.from('stripe_events').select('id').eq('id', id).maybeSingle(), 'stripe_events read')
      return !!data
    },
    async markEvent(id, type) {
      must(await db.from('stripe_events').upsert({ id, type }, { onConflict: 'id', ignoreDuplicates: true }), 'stripe_events write')
    },
    async userExists(userId) {
      const { data } = must(await db.from('users').select('id').eq('id', userId).maybeSingle(), 'users read')
      return !!data
    },
    async grant(g: Grant) {
      const row = { active: true, source: g.source, plan: g.plan, stripe_customer_id: g.customerId, stripe_subscription_id: g.subscriptionId }
      const { data: ex } = must(await db.from('app_access').select('id').eq('user_id', g.userId).eq('tool', g.tool).maybeSingle(), 'app_access read')
      if (ex) must(await db.from('app_access').update(row).eq('id', ex.id), 'app_access update')
      else must(await db.from('app_access').insert({ user_id: g.userId, tool: g.tool, ...row }), 'app_access insert')
    },
    async approveUser(userId) {
      must(await db.from('users').update({ approved: true, approved_at: new Date().toISOString() }).eq('id', userId).eq('approved', false), 'users approve')
      // Same founding rule as manual approval: paid funnels/all buyers before invoices launch get founding invoices.
      if (foundingOpen()) {
        const { data: rows } = must(await db.from('app_access').select('tool, active').eq('user_id', userId), 'app_access read')
        const covered = (rows || []).some((r: any) => r.active && (r.tool === 'funnels' || r.tool === 'all'))
        const hasInv = (rows || []).some((r: any) => r.tool === 'invoices')
        if (covered && !hasInv) must(await db.from('app_access').insert({ user_id: userId, tool: 'invoices', source: 'founding', active: true }), 'founding grant')
      }
    },
    async setSubscriptionActive(subscriptionId, active) {
      const { data } = must(await db.from('app_access').update({ active }).eq('stripe_subscription_id', subscriptionId).select('id'), 'app_access sub update')
      return (data || []).length
    },
  }
}
