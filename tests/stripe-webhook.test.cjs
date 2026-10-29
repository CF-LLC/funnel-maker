// Stripe webhook: signature verification (generateTestHeaderString) + event handling with an in-memory store.
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const Stripe = require('stripe')
const { handleEvent, parsePriceMap, subscriptionStatusActive } = jiti('../lib/stripe-webhook.ts')

const SECRET = 'whsec_test_secret'
const stripe = new Stripe('sk_test_unused')
const U = '4ae5bb76-7500-44cc-a768-b7af49606684'
const MAP = parsePriceMap(JSON.stringify({ price_funnels_m: { tool: 'funnels', plan: 'monthly' }, plink_inv: { tool: 'invoices', plan: 'monthly' }, price_all_y: { tool: 'all', plan: 'yearly' } }))

function signed(evt) {
  const payload = JSON.stringify(evt)
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET })
  return stripe.webhooks.constructEvent(payload, header, SECRET)
}

function fakeStore() {
  const s = { events: new Set(), users: { [U]: { approved: false } }, rows: [] }
  s.api = {
    eventProcessed: async (id) => s.events.has(id),
    markEvent: async (id) => { s.events.add(id) },
    userExists: async (id) => !!s.users[id],
    grant: async (g) => {
      const r = s.rows.find((x) => x.user_id === g.userId && x.tool === g.tool)
      const v = { active: true, source: g.source, plan: g.plan, stripe_customer_id: g.customerId, stripe_subscription_id: g.subscriptionId }
      r ? Object.assign(r, v) : s.rows.push({ user_id: g.userId, tool: g.tool, ...v })
    },
    approveUser: async (id) => { s.users[id].approved = true },
    setSubscriptionActive: async (sub, active) => { const rs = s.rows.filter((r) => r.stripe_subscription_id === sub); rs.forEach((r) => (r.active = active)); return rs.length },
  }
  return s
}

const checkout = (id, extra = {}) => ({ id, object: 'event', type: 'checkout.session.completed', data: { object: {
  id: 'cs_1', object: 'checkout.session', client_reference_id: U, payment_status: 'paid', customer: 'cus_1', subscription: 'sub_1', payment_link: null, ...extra } } })
const subEvt = (id, type, status) => ({ id, object: 'event', type, data: { object: { id: 'sub_1', object: 'subscription', status } } })

test('bad signature is rejected', () => {
  const payload = JSON.stringify(checkout('evt_bad'))
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_other' })
  assert.throws(() => stripe.webhooks.constructEvent(payload, header, SECRET))
})

test('checkout.session.completed (price id) grants funnels, stores Stripe ids, approves user; idempotent', async () => {
  const s = fakeStore()
  const deps = { store: s.api, priceMap: MAP, listLineItemPriceIds: async () => ['price_funnels_m'] }
  const evt = signed(checkout('evt_c1'))
  assert.equal((await handleEvent(evt, deps)).status, 'processed')
  assert.deepEqual(s.rows, [{ user_id: U, tool: 'funnels', active: true, source: 'single', plan: 'monthly', stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1' }])
  assert.equal(s.users[U].approved, true)
  assert.equal((await handleEvent(evt, deps)).status, 'duplicate')
  assert.equal(s.rows.length, 1)
})

test('checkout via payment link id maps invoices; all_access writes one tool=all row', async () => {
  const s = fakeStore()
  await handleEvent(signed(checkout('evt_c2', { payment_link: 'plink_inv' })), { store: s.api, priceMap: MAP })
  assert.equal(s.rows[0].tool, 'invoices')
  await handleEvent(signed(checkout('evt_c3', { subscription: 'sub_2' })), { store: s.api, priceMap: MAP, listLineItemPriceIds: async () => ['price_all_y'] })
  const all = s.rows.filter((r) => r.tool === 'all')
  assert.equal(all.length, 1); assert.equal(all[0].source, 'all_access'); assert.equal(s.rows.length, 2)
})

test('unpaid or unmapped checkouts do not approve', async () => {
  const s = fakeStore()
  const r1 = await handleEvent(signed(checkout('evt_c4', { payment_status: 'unpaid' })), { store: s.api, priceMap: MAP, listLineItemPriceIds: async () => ['price_funnels_m'] })
  const r2 = await handleEvent(signed(checkout('evt_c5')), { store: s.api, priceMap: MAP, listLineItemPriceIds: async () => ['price_unknown'] })
  const r3 = await handleEvent(signed(checkout('evt_c6', { client_reference_id: null })), { store: s.api, priceMap: MAP })
  assert.deepEqual([r1.status, r2.status, r3.status], ['ignored', 'ignored', 'ignored'])
  assert.equal(s.users[U].approved, false); assert.equal(s.rows.length, 0)
})

test('customer.subscription.updated maps statuses', async () => {
  const s = fakeStore()
  await handleEvent(signed(checkout('evt_c7')), { store: s.api, priceMap: MAP, listLineItemPriceIds: async () => ['price_funnels_m'] })
  const deps = { store: s.api, priceMap: MAP }
  await handleEvent(signed(subEvt('evt_u1', 'customer.subscription.updated', 'past_due')), deps); assert.equal(s.rows[0].active, true)
  await handleEvent(signed(subEvt('evt_u2', 'customer.subscription.updated', 'unpaid')), deps); assert.equal(s.rows[0].active, false)
  await handleEvent(signed(subEvt('evt_u3', 'customer.subscription.updated', 'trialing')), deps); assert.equal(s.rows[0].active, true)
  await handleEvent(signed(subEvt('evt_u4', 'customer.subscription.updated', 'incomplete_expired')), deps); assert.equal(s.rows[0].active, false)
  assert.equal((await handleEvent(signed(subEvt('evt_u5', 'customer.subscription.updated', 'incomplete')), deps)).status, 'ignored')
  assert.deepEqual(['active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete_expired', 'paused'].map(subscriptionStatusActive), [true, true, true, false, false, false, null])
})

test('customer.subscription.deleted deactivates the rows for that subscription', async () => {
  const s = fakeStore()
  await handleEvent(signed(checkout('evt_c8')), { store: s.api, priceMap: MAP, listLineItemPriceIds: async () => ['price_all_y'] })
  const r = await handleEvent(signed(subEvt('evt_d1', 'customer.subscription.deleted', 'canceled')), { store: s.api, priceMap: MAP })
  assert.equal(r.status, 'processed'); assert.equal(s.rows[0].active, false)
})

test('price map validation and route wiring', () => {
  assert.throws(() => parsePriceMap('{"price_x":{"tool":"other"}}'))
  assert.throws(() => parsePriceMap('nope'))
  const src = fs.readFileSync(path.join(root, 'app/api/stripe/webhook/route.ts'), 'utf8')
  assert.match(src, /request\.text\(\)/); assert.match(src, /constructEvent\(raw, sig, secret\)/)
})

test('hasAccess honours All Access rows', () => {
  const src = fs.readFileSync(path.join(root, 'lib/access.ts'), 'utf8')
  assert.match(src, /\.in\('tool', \[tool, 'all'\]\)/)
})

test('changelog: live price + payment link ids grant tool=changelog (single)', async () => {
  const map = parsePriceMap(JSON.stringify({ price_1UVujGDs9LwkRsZN2jodVk9P: { tool: 'changelog', plan: 'monthly' }, plink_1UVujWDs9LwkRsZNGvkAFJG5: { tool: 'changelog', plan: 'yearly' } }))
  const s = fakeStore()
  assert.equal((await handleEvent(signed(checkout('evt_cl1')), { store: s.api, priceMap: map, listLineItemPriceIds: async () => ['price_1UVujGDs9LwkRsZN2jodVk9P'] })).status, 'processed')
  assert.equal(s.rows[0].tool, 'changelog'); assert.equal(s.rows[0].plan, 'monthly'); assert.equal(s.rows[0].source, 'single')
  const s2 = fakeStore()
  assert.equal((await handleEvent(signed(checkout('evt_cl2', { payment_link: 'plink_1UVujWDs9LwkRsZNGvkAFJG5' })), { store: s2.api, priceMap: map, listLineItemPriceIds: async () => [] })).status, 'processed')
  assert.equal(s2.rows[0].tool, 'changelog'); assert.equal(s2.rows[0].plan, 'yearly')
})
