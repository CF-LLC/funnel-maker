// Billing + gating checks. Run with: npm test
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')

test('checkoutUrl only accepts https buy.stripe.com links and tags the user', () => {
  const { checkoutUrl } = jiti('../lib/plans.ts')
  const base = { id: 'monthly', name: 'M', price: '$12', period: '/month', note: '' }
  assert.equal(checkoutUrl({ ...base, link: undefined }), null)
  assert.equal(checkoutUrl({ ...base, link: '' }), null)
  assert.equal(checkoutUrl({ ...base, link: 'https://evil.example/pay' }), null)
  assert.equal(checkoutUrl({ ...base, link: 'http://buy.stripe.com/x' }), null)
  const u = new URL(checkoutUrl({ ...base, link: 'https://buy.stripe.com/test_abc' }, { id: 'u-1', email: 'a@b.co' }))
  assert.equal(u.hostname, 'buy.stripe.com')
  assert.equal(u.searchParams.get('client_reference_id'), 'u-1')
  assert.equal(u.searchParams.get('prefilled_email'), 'a@b.co')
})

test('plans match published prices', () => {
  const { PLANS } = jiti('../lib/plans.ts')
  assert.deepEqual(PLANS.map((p) => [p.id, p.price]), [['monthly', '$12'], ['yearly', '$99'], ['founding', '$79']])
})

test('legacy Stripe API routes are disabled (no Stripe objects, no billing writes)', () => {
  for (const r of ['checkout', 'portal', 'webhook']) {
    const src = read(`app/api/billing/${r}/route.ts`)
    assert.match(src, /status: 410/)
    assert.doesNotMatch(src, /getStripe|from\('subscriptions'\)/)
  }
})

test('publish gate is enforced in the database, not just the UI', () => {
  const sql = read('supabase/migrations/20261017_v1_templates.sql')
  assert.match(sql, /create trigger fm_enforce_publish before insert or update of is_public on public\.funnels/)
  assert.match(sql, /account_pending_approval/)
  assert.match(sql, /live_funnel_limit/)
  const plans = read('supabase/migrations/20261017_v1_plans.sql')
  // users cannot grant themselves approval or a paid plan
  for (const col of ['approved', 'plan', 'paid_until']) assert.match(plans, new RegExp(`new\\.${col} is distinct from old\\.${col}`))
})

test('admin approval endpoint requires an admin', () => {
  const src = read('app/api/admin/approve/route.ts')
  // Non-admins (and signed-out) get 404 via adminApiGuard (tests/admin.test.cjs covers the guard itself).
  assert.equal((src.match(/const g = await adminApiGuard\(\)\n  if \(g\.res\) return g\.res/g) || []).length, 2)
})

test('welcome email route is auth-only and never takes an arbitrary address', () => {
  const src = read('app/api/emails/welcome/route.ts')
  assert.match(src, /auth\.getUser\(\)/)
  assert.doesNotMatch(src, /request\.json/)
})

test('legal pages exist, are linked, and contain no street address', () => {
  const footer = read('components/nav/footer.tsx')
  for (const p of ['terms', 'privacy', 'refund']) {
    const src = read(`app/${p}/page.tsx`)
    assert.doesNotMatch(src, /\d+\s+\w+\s+(St|Street|Ave|Avenue|Rd|Road|Blvd|Dr|Drive|Lane|Ln)\b/i)
    assert.match(footer, new RegExp(`href="/${p}"`))
  }
  assert.match(read('lib/site.ts'), /Bentonville, Arkansas/)
  assert.match(read('components/pricing-plans.tsx'), /href="\/refund"/)
})
