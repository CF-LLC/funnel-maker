// Pure referral helpers (no I/O). Codes are 8 chars [a-z0-9] with at least one digit, so they never collide
// with the "Made with SaaS Nation" tool tags (?ref=invoices etc., letters only).
import { randomBytes } from 'node:crypto'

export const REFERRAL_COOKIE = 'sn_referral'
export const REFERRAL_COOKIE_DAYS = 30
/** Only accounts created this recently can be attributed (stops old users being "referred" later). */
export const ATTACH_WINDOW_DAYS = 7
export const isReferralCode = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9]{8}$/.test(v) && /[0-9]/.test(v)

const ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789'
export function newReferralCode(rand: (n: number) => Buffer = randomBytes): string {
  for (;;) {
    const c = [...rand(8)].map((b) => ALPHA[b % ALPHA.length]).join('')
    if (isReferralCode(c)) return c
  }
}

/** Rewards are OFF unless REFERRALS_REWARDS_ENABLED is exactly 'true' or '1'. Nothing grants rewards yet even when on. */
export const referralRewardsEnabled = (v: string | undefined = process.env.REFERRALS_REWARDS_ENABLED) => v === 'true' || v === '1'
export const referralLink = (code: string, site = 'https://saasnation.site') => `${site}/?ref=${code}`

export function shouldAttach(o: { code: unknown; userId: string; userCreatedAt: string | null | undefined; referrerId: string | null; now?: Date }): boolean {
  if (!isReferralCode(o.code) || !o.referrerId || o.referrerId === o.userId || !o.userCreatedAt) return false
  const age = (o.now ?? new Date()).getTime() - new Date(o.userCreatedAt).getTime()
  return age >= 0 && age <= ATTACH_WINDOW_DAYS * 86400_000
}

export type Stats = { signups: number; paid: number }
export function countStats(rows: { referred_user_id: string; status: string }[], paidUserIds: Set<string>): Stats {
  return { signups: rows.filter((r) => r.status !== 'rejected').length, paid: rows.filter((r) => r.status !== 'rejected' && (paidUserIds.has(r.referred_user_id) || r.status === 'paid' || r.status === 'rewarded')).length }
}
