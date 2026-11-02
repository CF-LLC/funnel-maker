import { serviceClient } from '@/lib/server/admin-client'
import type { RewardStore, Side } from '@/lib/referrals/rewards'

const COLS = 'id, referrer_id, referred_user_id, status, referred_reward_at, referrer_reward_at'
/** Supabase-backed store for referral coupon rewards (service role). */
export function referralRewardStore(): RewardStore {
  const db = serviceClient() as any
  const must = <T extends { error: any }>(r: T, what: string) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r }
  const col = (side: Side) => (side === 'referred' ? 'referred_reward_at' : 'referrer_reward_at')
  return {
    async userIdForSubscription(sub) {
      const { data } = must(await db.from('app_access').select('user_id').eq('stripe_subscription_id', sub).limit(1), 'app_access read')
      return data?.[0]?.user_id ?? null
    },
    async attributionForReferred(userId) {
      const { data } = must(await db.from('referral_attributions').select(COLS).eq('referred_user_id', userId).maybeSingle(), 'attribution read')
      return data ?? null
    },
    async pendingAsReferrer(userId) {
      const { data } = must(await db.from('referral_attributions').select(COLS).eq('referrer_id', userId).in('status', ['paid', 'rewarded']).is('referrer_reward_at', null), 'attribution read')
      return data || []
    },
    async claim(id, side) {
      const { data } = must(await db.from('referral_attributions').update({ [col(side)]: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id).is(col(side), null).neq('status', 'rejected').select(COLS), 'attribution claim')
      const row = data?.[0]
      if (row?.referred_reward_at && row?.referrer_reward_at) must(await db.from('referral_attributions').update({ status: 'rewarded' }).eq('id', id), 'attribution rewarded')
      return !!row
    },
    async unclaim(id, side) { must(await db.from('referral_attributions').update({ [col(side)]: null }).eq('id', id), 'attribution unclaim') },
    async setStatus(id, status) { must(await db.from('referral_attributions').update({ status, updated_at: new Date().toISOString() }).eq('id', id).neq('status', 'rejected'), 'attribution status') },
    async referrerRewardsSince(referrerId, since) {
      const { count } = must(await db.from('referral_attributions').select('id', { count: 'exact', head: true }).eq('referrer_id', referrerId).gte('referrer_reward_at', since.toISOString()), 'attribution count')
      return count || 0
    },
    async activeSubscription(userId) {
      const { data } = must(await db.from('app_access').select('tool, stripe_subscription_id').eq('user_id', userId).eq('active', true).not('stripe_subscription_id', 'is', null), 'app_access read')
      const rows = (data || []) as { tool: string; stripe_subscription_id: string }[]
      const r = rows.find((x) => x.tool === 'all') || rows[0]
      return r ? { subscriptionId: r.stripe_subscription_id, tool: r.tool } : null
    },
  }
}
