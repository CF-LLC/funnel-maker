// Funnel access gating, /healthz, and payment-link mapping without STRIPE_SECRET_KEY.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')

test('/healthz returns 200 {ok:true} without DB and skips middleware', async () => {
  const src = read('app/healthz/route.ts')
  assert.doesNotMatch(src, /supabase|serviceClient|fetch\(/i)
  const { GET } = jiti('../app/healthz/route.ts')
  const r = GET()
  assert.equal(r.status, 200)
  assert.deepEqual(await r.json(), { ok: true })
  assert.match(read('middleware.ts'), /\(\?!healthz\|/)
  assert.match(read('docker-compose.yml'), /127\.0\.0\.1:3000\/healthz/)
})

test('DB migration gates create/publish/public read/leads on funnels-or-all access', () => {
  const sql = read('supabase/migrations/20261020_gate_funnels_access.sql')
  assert.match(sql, /tool in \('funnels', 'all'\) and active/)
  assert.match(sql, /is_public = true and public\.fm_has_funnels_access\(user_id\)/)
  assert.match(sql, /raise exception 'funnels_access_required'/)
  assert.match(sql, /before insert or update of is_public on public\.funnels/)
  assert.match(sql, /fm_submit_lead[\s\S]*fm_has_funnels_access\(user_id\)/)
  assert.doesNotMatch(sql, /\bdelete from\b|\btruncate\b|update public\.users/i)
})

test('webhook never flips users.approved off', () => {
  for (const f of ['lib/stripe-webhook.ts', 'lib/server/stripe-store.ts']) assert.doesNotMatch(read(f), /approved:\s*false/)
})

test('public funnel API answers with a neutral 404', () => {
  const src = read('app/api/public/funnels/[funnelId]/route.ts')
  assert.match(src, /This page is unavailable\./)
  assert.match(src, /status: 404/)
})

test('payment link id maps a checkout without STRIPE_SECRET_KEY (no line-item lookup)', async () => {
  const { handleEvent, parsePriceMap } = jiti('../lib/stripe-webhook.ts')
  const U = '4ae5bb76-7500-44cc-a768-b7af49606684'
  const grants = []; let approved = false
  const store = { eventProcessed: async () => false, markEvent: async () => {}, userExists: async () => true,
    grant: async (g) => grants.push(g), approveUser: async () => { approved = true }, setSubscriptionActive: async () => 0 }
  const evt = { id: 'evt_pl', type: 'checkout.session.completed', data: { object: { id: 'cs_x', client_reference_id: U, payment_status: 'paid', customer: 'cus_9', subscription: 'sub_9', payment_link: 'plink_123' } } }
  const r = await handleEvent(evt, { store, priceMap: parsePriceMap('{"plink_123":{"tool":"funnels","plan":"monthly"}}') /* listLineItemPriceIds omitted = no secret key */ })
  assert.equal(r.status, 'processed')
  assert.equal(grants[0].tool, 'funnels'); assert.equal(grants[0].subscriptionId, 'sub_9'); assert.equal(approved, true)
})
