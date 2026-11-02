// Server-only. Referral codes + attributions with the service role. Never grants rewards.
import { cookies } from 'next/headers'
import { serviceClient } from '@/lib/server/admin-client'
import { recordSiteEvent } from '@/lib/site-events/server'
import { REFERRAL_COOKIE, countStats, newReferralCode, shouldAttach, type Stats } from './core'

export async function getOrCreateCode(userId: string): Promise<string | null> {
  try {
    const db = serviceClient()
    const { data } = await db.from('referral_codes').select('code').eq('user_id', userId).maybeSingle()
    if (data?.code) return data.code
    for (let i = 0; i < 3; i++) {
      const code = newReferralCode()
      const { error } = await db.from('referral_codes').insert({ user_id: userId, code })
      if (!error) return code
      if (error.code === '23505') { const again = await db.from('referral_codes').select('code').eq('user_id', userId).maybeSingle(); if (again.data?.code) return again.data.code; continue }
      return null
    }
  } catch { /* never break the dashboard */ }
  return null
}

/** Attach a new account to the referral code in its first-party cookie, once. Never throws. */
export async function attachReferralOnce(user: { id: string; created_at?: string | null }): Promise<void> {
  try {
    const code = (await cookies()).get(REFERRAL_COOKIE)?.value
    if (!code) return
    const db = serviceClient()
    const { data: owner } = await db.from('referral_codes').select('user_id').eq('code', code).maybeSingle()
    if (!shouldAttach({ code, userId: user.id, userCreatedAt: user.created_at, referrerId: owner?.user_id ?? null })) return
    const { error } = await db.from('referral_attributions').insert({ referrer_id: owner!.user_id, referred_user_id: user.id, code })
    if (!error) await recordSiteEvent({ event: 'referral_signup', path: '/dashboard' })
  } catch { /* tracking must never break the dashboard */ }
}

export async function referralStats(userId: string): Promise<Stats> {
  try {
    const db = serviceClient()
    const { data: rows } = await db.from('referral_attributions').select('referred_user_id, status').eq('referrer_id', userId)
    const ids = (rows || []).map((r) => r.referred_user_id)
    const paid = new Set<string>()
    if (ids.length) { const { data: acc } = await db.from('app_access').select('user_id').in('user_id', ids).eq('active', true); for (const a of acc || []) paid.add(a.user_id) }
    return countStats(rows || [], paid)
  } catch { return { signups: 0, paid: 0 } }
}
