const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const R = jiti('../lib/referrals/rewards.ts')
const { handleEvent } = jiti('../lib/stripe-webhook.ts')
const A = 'referrer', B = 'friend'
const COUP = { single: 'coupon_month12', all: 'coupon_month29' }

function world({ referrerSub = { subscriptionId: 'sub_A', tool: 'all' } } = {}) {
  const w = { att: { id: 1, referrer_id: A, referred_user_id: B, status: 'signed_up', referred_reward_at: null, referrer_reward_at: null }, applied: [], subs: { sub_B: B, sub_A: A }, active: { [B]: { subscriptionId: 'sub_B', tool: 'invoices' }, [A]: referrerSub } }
  const col = (s) => (s === 'referred' ? 'referred_reward_at' : 'referrer_reward_at')
  w.store = {
    userIdForSubscription: async (s) => w.subs[s] || null,
    attributionForReferred: async (u) => (u === B ? { ...w.att } : null),
    pendingAsReferrer: async (u) => (u === A && ['paid', 'rewarded'].includes(w.att.status) && !w.att.referrer_reward_at ? [{ ...w.att }] : []),
    claim: async (id, s) => { if (w.att[col(s)] || w.att.status === 'rejected') return false; w.att[col(s)] = 'now'; if (w.att.referred_reward_at && w.att.referrer_reward_at) w.att.status = 'rewarded'; return true },
    unclaim: async (id, s) => { w.att[col(s)] = null },
    setStatus: async (id, st) => { w.att.status = st },
    referrerRewardsSince: async () => 0,
    activeSubscription: async (u) => w.active[u] || null,
  }
  w.deps = { store: w.store, coupons: COUP, enabled: true, applyCoupon: async (sub, c, key) => { w.applied.push([sub, c, key]) } }
  return w
}

test('off by default: nothing applied unless enabled', async () => {
  const w = world(); assert.equal(await R.onInvoicePaid({ subscription: 'sub_B', amount_paid: 1200 }, { ...w.deps, enabled: undefined }), 'referrals off')
  assert.equal(w.applied.length, 0)
  assert.ok(!/^REFERRALS_REWARDS_ENABLED=\S/m.test(fs.readFileSync(path.join(root, '.env.example'), 'utf8')))
})

test('$0 trial invoice never rewards; first real payment rewards both sides once, with the right coupon', async () => {
  const w = world()
  assert.equal(await R.onInvoicePaid({ subscription: 'sub_B', amount_paid: 0 }, w.deps), 'zero invoice')
  await R.onInvoicePaid({ subscription: 'sub_B', amount_paid: 1200 }, w.deps)
  assert.deepEqual(w.applied, [['sub_B', 'coupon_month12', 'referral-1-referred'], ['sub_A', 'coupon_month29', 'referral-1-referrer']])
  assert.equal(w.att.status, 'rewarded')
  await R.onInvoicePaid({ subscription: 'sub_B', amount_paid: 1200 }, w.deps) // next month / replay
  assert.equal(w.applied.length, 2)
})

test('referrer without an active subscription is held, then rewarded on their own first paid invoice', async () => {
  const w = world({ referrerSub: null })
  await R.onInvoicePaid({ subscription: 'sub_B', amount_paid: 1200 }, w.deps)
  assert.equal(w.applied.length, 1); assert.equal(w.att.status, 'paid')
  w.active[A] = { subscriptionId: 'sub_A', tool: 'crm' }
  await R.onInvoicePaid({ subscription: 'sub_A', amount_paid: 1200 }, w.deps)
  assert.deepEqual(w.applied[1], ['sub_A', 'coupon_month12', 'referral-1-referrer']); assert.equal(w.att.status, 'rewarded')
})

test('rejected referrals, monthly cap and Stripe failure (claim released for retry)', async () => {
  const w = world(); w.att.status = 'rejected'
  await R.onInvoicePaid({ subscription: 'sub_B', amount_paid: 1200 }, w.deps); assert.equal(w.applied.length, 0)
  const c = world(); c.store.referrerRewardsSince = async () => R.MAX_REFERRER_REWARDS_PER_MONTH
  await R.onInvoicePaid({ subscription: 'sub_B', amount_paid: 1200 }, c.deps); assert.equal(c.applied.length, 1); assert.equal(c.att.referrer_reward_at, null)
  const f = world(); f.deps.applyCoupon = async () => { throw new Error('stripe down') }
  await assert.rejects(R.onInvoicePaid({ subscription: 'sub_B', amount_paid: 1200 }, f.deps)); assert.equal(f.att.referred_reward_at, null)
})

test('webhook: invoice.paid routes to rewards only when wired; ignored otherwise', async () => {
  const st = { eventProcessed: async () => false, markEvent: async () => {} }
  const ev = { id: 'evt', type: 'invoice.paid', data: { object: { subscription: 'sub_B', amount_paid: 1200 } } }
  assert.equal((await handleEvent(ev, { store: st, priceMap: {} })).status, 'ignored')
  const w = world(); const r = await handleEvent(ev, { store: st, priceMap: {}, rewards: w.deps })
  assert.equal(r.status, 'processed'); assert.equal(w.applied.length, 2)
  const route = fs.readFileSync(path.join(root, 'app/api/stripe/webhook/route.ts'), 'utf8')
  assert.match(route, /referralRewardsEnabled\(\) && process\.env\.STRIPE_SECRET_KEY/)
})

test('migration is additive', () => {
  const m = fs.readFileSync(path.join(root, 'supabase/migrations/20261101e_referral_rewards.sql'), 'utf8')
  assert.ok(!/drop |delete |truncate/i.test(m)); assert.match(m, /add column if not exists referred_reward_at/)
})
