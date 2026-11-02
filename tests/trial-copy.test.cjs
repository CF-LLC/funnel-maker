const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')

test('trial copy: monthly only, card up front, 7 days, refund from first charge', () => {
  const C = jiti('../lib/trial/copy.ts')
  assert.equal(C.TRIAL_FLAG, 'trial_public'); assert.equal(C.TRIAL_DAYS, 7)
  for (const s of [C.TRIAL_NOTE, C.TRIAL_FAQ[1]]) { assert.match(s, /[Mm]onthly/); assert.match(s, /7/); assert.match(s, /card/i); assert.match(s, /[Yy]early plans (have no trial|are billed right away)/) }
  assert.match(C.TRIAL_REFUND, /first charge/)
})

test('trial wording is gated behind the trial_public runtime flag (default off migration)', () => {
  const mig = read('supabase/migrations/20261101d_trial_flag.sql')
  assert.match(mig, /'trial_public', false/); assert.match(mig, /on conflict \(key\) do nothing/); assert.ok(!/drop|delete|update /i.test(mig))
  assert.match(read('app/pricing/page.tsx'), /isFeatureEnabled\(TRIAL_FLAG\)/)
  assert.match(read('components/pricing-plans.tsx'), /\{trial && <p data-trial-note/)
  for (const p of ['app/terms/page.tsx', 'app/refund/page.tsx']) { const s = read(p); assert.match(s, /isFeatureEnabled\(TRIAL_FLAG\)/); assert.match(s, /\{trial && /) }
  // No ungated trial claim anywhere in public pages
  for (const p of ['app/pricing/page.tsx', 'app/terms/page.tsx', 'app/refund/page.tsx', 'components/pricing-plans.tsx', 'lib/og/pages.ts', 'lib/landing/registry.ts']) {
    const s = read(p).replace(/\{trial && [^\n]*/g, '').replace(/trial \? '[^']*'/g, '')
    assert.ok(!/free trial/i.test(s), p)
  }
})
