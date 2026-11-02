// Batch 2 (8): honest trust signals only.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')

test('trust line says CF LLC in Arkansas, no street address', () => {
  const site = jiti('../lib/site.ts')
  assert.equal(site.COMPANY, 'CF LLC'); assert.equal(site.COMPANY_STATE, 'Arkansas')
  const c = read('components/trust-line.tsx')
  assert.match(c, /Built by \{COMPANY\} in \{COMPANY_STATE\}/)
  assert.doesNotMatch(c + read('lib/site.ts'), /\d+\s+\w+\s+(St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Blvd)\b/)
})
test('refund promise matches the Refund Policy page and links to it', () => {
  const { REFUND_PROMISE } = jiti('../lib/site.ts')
  assert.match(REFUND_PROMISE, /within 14 days of your first payment/)
  assert.match(read('app/refund/page.tsx'), /within 14 days of your first payment and we&apos;ll refund it in full/)
  assert.match(read('components/trust-line.tsx'), /href="\/refund"/)
})
test('shown on home and pricing; no invented testimonials, ratings or counts', () => {
  assert.match(read('app/page.tsx'), /<TrustLine/)
  assert.match(read('app/pricing/page.tsx'), /<TrustLine/)
  assert.doesNotMatch(read('components/trust-line.tsx').replace(/\/\*[\s\S]*?\*\//g, ''), /★|stars?|rating|customers|users|testimonial/i)
  const { SOCIAL_PROOF } = jiti('../lib/home/social-proof.ts')
  assert.equal(SOCIAL_PROOF.quotes.length, 0); assert.equal(SOCIAL_PROOF.stats.length, 0)
})
