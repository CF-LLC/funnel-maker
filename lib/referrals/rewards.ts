// "Give a month, get a month" (Option B: one-time coupon). OFF unless REFERRALS_REWARDS_ENABLED is on.
// Trigger: Stripe `invoice.paid` with amount_paid > 0 (a real charge, never a $0 trial invoice) for a referred user.
// Each side is claimed in the DB (column set once, `where ... is null`) BEFORE Stripe is called, and Stripe calls carry an
// idempotency key, so a reward is applied at most once per referral side even if events are retried or replayed.
import { referralRewardsEnabled } from './core'

/** Live coupon ids (not secrets): one month of a single tool ($12) and one month of All Access ($29), duration once. */
export type CouponIds = { single: string | null; all: string | null }
export const couponIds = (env: Record<string, string | undefined> = process.env): CouponIds => ({ single: env.REFERRAL_COUPON_SINGLE || null, all: env.REFERRAL_COUPON_ALL || null })
export const MAX_REFERRER_REWARDS_PER_MONTH = 5

export type Attribution = { id: number; referrer_id: string; referred_user_id: string; status: string; referred_reward_at: string | null; referrer_reward_at: string | null }
export type ActiveSub = { subscriptionId: string; tool: string }
export type Side = 'referred' | 'referrer'

export interface RewardStore {
  userIdForSubscription(subscriptionId: string): Promise<string | null>
  attributionForReferred(userId: string): Promise<Attribution | null>
  /** Attributions where this user is the referrer, the friend has paid, and the referrer reward is still pending. */
  pendingAsReferrer(userId: string): Promise<Attribution[]>
  /** Sets <side>_reward_at = now only if null. True if this call claimed it. */
  claim(id: number, side: Side): Promise<boolean>
  unclaim(id: number, side: Side): Promise<void>
  setStatus(id: number, status: 'paid' | 'rewarded'): Promise<void>
  referrerRewardsSince(referrerId: string, since: Date): Promise<number>
  activeSubscription(userId: string): Promise<ActiveSub | null>
}
export type RewardDeps = { store: RewardStore; applyCoupon: (subscriptionId: string, couponId: string, idempotencyKey: string) => Promise<void>; coupons: CouponIds; enabled?: boolean; now?: Date }

const couponFor = (tool: string, c: CouponIds) => (tool === 'all' ? c.all : c.single)

async function reward(a: Attribution, side: Side, userId: string, d: RewardDeps): Promise<'applied' | 'held' | 'skipped'> {
  const sub = await d.store.activeSubscription(userId)
  const coupon = sub && couponFor(sub.tool, d.coupons)
  if (!sub || !coupon) return 'held' // no active paid subscription (or coupon not configured): stays pending, retried on their next paid invoice
  if (side === 'referrer') {
    const now = d.now ?? new Date()
    const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    if ((await d.store.referrerRewardsSince(a.referrer_id, since)) >= MAX_REFERRER_REWARDS_PER_MONTH) return 'held'
  }
  if (!(await d.store.claim(a.id, side))) return 'skipped'
  try { await d.applyCoupon(sub.subscriptionId, coupon, `referral-${a.id}-${side}`) } catch (e) { await d.store.unclaim(a.id, side); throw e }
  return 'applied'
}

/** Handles a paid invoice. Returns a short detail string (no ids, no emails). */
export async function onInvoicePaid(inv: { subscription?: unknown; amount_paid?: number | null; parent?: any }, d: RewardDeps): Promise<string> {
  if (!(d.enabled ?? referralRewardsEnabled())) return 'referrals off'
  if (!inv.amount_paid || inv.amount_paid <= 0) return 'zero invoice'
  const raw = inv.subscription ?? inv.parent?.subscription_details?.subscription
  const subId = typeof raw === 'string' ? raw : raw && typeof raw === 'object' && 'id' in (raw as any) ? String((raw as any).id) : null
  if (!subId) return 'no subscription'
  const userId = await d.store.userIdForSubscription(subId)
  if (!userId) return 'unknown subscription'
  const out: string[] = []
  // 1) This user was referred: first real payment -> their free month, then the referrer's.
  const a = await d.store.attributionForReferred(userId)
  if (a && a.status !== 'rejected') {
    if (a.status === 'signed_up') await d.store.setStatus(a.id, 'paid')
    if (!a.referred_reward_at) out.push(`referred:${await reward(a, 'referred', userId, d)}`)
    if (!a.referrer_reward_at) out.push(`referrer:${await reward(a, 'referrer', a.referrer_id, d)}`)
  }
  // 2) This user is a referrer with rewards held (they had no active subscription earlier): grant now.
  for (const p of await d.store.pendingAsReferrer(userId)) out.push(`held-referrer:${await reward(p, 'referrer', userId, d)}`)
  return out.join(',') || 'no referral'
}

/** status = rewarded once both sides are applied. */
export const bothRewarded = (a: Pick<Attribution, 'referred_reward_at' | 'referrer_reward_at'>) => !!a.referred_reward_at && !!a.referrer_reward_at
