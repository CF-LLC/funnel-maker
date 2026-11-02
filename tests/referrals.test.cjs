const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const R = jiti('../lib/referrals/core.ts')
const { REFS } = jiti('../lib/acquisition/core.ts')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')

test('codes: 8 chars, a digit, never a tool ref tag', () => {
  for (let i = 0; i < 200; i++) assert.ok(R.isReferralCode(R.newReferralCode()))
  for (const r of REFS) assert.equal(R.isReferralCode(r), false)
  for (const bad of ['ABCDEFG1', 'abcdefgh', 'abc1', 'abcdefg1x', '../x1234', null]) assert.equal(R.isReferralCode(bad), false)
})

test('rewards off by default; only exact true/1 turns them on', () => {
  assert.equal(R.referralRewardsEnabled(undefined), false)
  for (const v of ['', 'false', '0', 'yes', 'TRUE']) assert.equal(R.referralRewardsEnabled(v), false)
  assert.equal(R.referralRewardsEnabled('true'), true)
  assert.ok(!read('.env.example').match(/^REFERRALS_REWARDS_ENABLED=\S/m))
})

test('attach only new accounts, never self', () => {
  const now = new Date('2026-11-02T00:00:00Z')
  const base = { code: 'abcd2345', userId: 'u', referrerId: 'r', now }
  assert.equal(R.shouldAttach({ ...base, userCreatedAt: '2026-11-01T00:00:00Z' }), true)
  assert.equal(R.shouldAttach({ ...base, userCreatedAt: '2026-10-01T00:00:00Z' }), false)
  assert.equal(R.shouldAttach({ ...base, referrerId: 'u', userCreatedAt: '2026-11-01T00:00:00Z' }), false)
  assert.equal(R.shouldAttach({ ...base, referrerId: null, userCreatedAt: '2026-11-01T00:00:00Z' }), false)
  assert.equal(R.shouldAttach({ ...base, code: 'invoices', userCreatedAt: '2026-11-01T00:00:00Z' }), false)
})

test('counts', () => {
  const rows = [{ referred_user_id: 'a', status: 'signed_up' }, { referred_user_id: 'b', status: 'signed_up' }, { referred_user_id: 'c', status: 'rejected' }]
  assert.deepEqual(R.countStats(rows, new Set(['b', 'c'])), { signups: 2, paid: 1 })
})

test('UI promises no reward while off; no Stripe calls in referral code', () => {
  const card = read('components/referrals/refer-card.tsx')
  assert.match(card, /rewardsOn \?/)
  assert.match(card, /rewards are coming soon/)
  for (const f of ['lib/referrals/core.ts', 'lib/referrals/server.ts', 'components/referrals/refer-card.tsx', 'components/referrals/referral-capture.tsx']) assert.doesNotMatch(read(f), /stripe/i, f)
})

test('migration is additive + idempotent and locked to the service role', () => {
  const sql = read('supabase/migrations/20261101b_referrals.sql')
  assert.doesNotMatch(sql, /drop table|drop column|delete from|truncate/i)
  assert.match(sql, /create table if not exists public\.referral_codes/)
  assert.match(sql, /referred_user_id uuid not null unique/)
  assert.equal((sql.match(/force row level security/g) || []).length, 2)
  assert.equal((sql.match(/revoke all on public\.referral_\w+ from public, anon, authenticated/g) || []).length, 2)
  for (const e of ['pageview', 'signup_started', 'signup_completed', 'checkout_clicked', 'checkout_completed', 'free_tool_used', 'email_captured', 'upgrade_clicked']) assert.ok(sql.includes(`'${e}'`), e)
})

test('site events accept referral_landed from browser only; referral_signup is server-only', () => {
  const E = jiti('../lib/site-events/core.ts')
  assert.ok(E.CLIENT_EVENTS.includes('referral_landed'))
  assert.ok(!E.CLIENT_EVENTS.includes('referral_signup'))
  assert.ok(E.SITE_EVENTS.includes('referral_signup'))
})
