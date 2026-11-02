// 7-day trial readiness: a Payment Link checkout with a trial completes with payment_status 'no_payment_required'
// and a 'trialing' subscription. Access must be granted then, and revoked when the trial ends without payment.
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const { handleEvent, parsePriceMap, subscriptionStatusActive } = jiti('../lib/stripe-webhook.ts')
const U = '4ae5bb76-7500-44cc-a768-b7af49606684'
const MAP = parsePriceMap(JSON.stringify({ plink_inv_trial: { tool: 'invoices', plan: 'monthly' } }))
function store() {
  const s = { events: new Set(), rows: [] }
  s.api = { eventProcessed: async (id) => s.events.has(id), markEvent: async (id) => { s.events.add(id) }, userExists: async () => true,
    grant: async (g) => { s.rows.push({ tool: g.tool, active: true, sub: g.subscriptionId }) }, approveUser: async () => {},
    setSubscriptionActive: async (sub, a) => { const r = s.rows.filter((x) => x.sub === sub); r.forEach((x) => (x.active = a)); return r.length } }
  return s
}
const ev = (id, type, object) => ({ id, object: 'event', type, data: { object } })

test('trial checkout (no_payment_required) grants access; trialing keeps it; trial end without payment revokes', async () => {
  const s = store(); const d = { store: s.api, priceMap: MAP }
  const r = await handleEvent(ev('e1', 'checkout.session.completed', { id: 'cs', client_reference_id: U, payment_status: 'no_payment_required', payment_link: 'plink_inv_trial', customer: 'cus', subscription: 'sub_t' }), d)
  assert.equal(r.status, 'processed'); assert.equal(s.rows[0].active, true)
  assert.equal(subscriptionStatusActive('trialing'), true)
  await handleEvent(ev('e2', 'customer.subscription.updated', { id: 'sub_t', status: 'trialing' }), d); assert.equal(s.rows[0].active, true)
  // trial_settings.end_behavior.missing_payment_method = cancel -> subscription deleted
  await handleEvent(ev('e3', 'customer.subscription.deleted', { id: 'sub_t', status: 'canceled' }), d); assert.equal(s.rows[0].active, false)
})

test('trial converting to paid keeps access; failed first charge ending unpaid revokes; trial_will_end is ignored', async () => {
  const s = store(); const d = { store: s.api, priceMap: MAP }
  await handleEvent(ev('a', 'checkout.session.completed', { id: 'cs', client_reference_id: U, payment_status: 'no_payment_required', payment_link: 'plink_inv_trial', subscription: 'sub_t' }), d)
  await handleEvent(ev('b', 'customer.subscription.updated', { id: 'sub_t', status: 'active' }), d); assert.equal(s.rows[0].active, true)
  await handleEvent(ev('c', 'customer.subscription.updated', { id: 'sub_t', status: 'unpaid' }), d); assert.equal(s.rows[0].active, false)
  const w = await handleEvent(ev('w', 'customer.subscription.trial_will_end', { id: 'sub_t', status: 'trialing' }), d); assert.equal(w.status, 'ignored')
})
