// HQ analytics: site_events reduced to 7/30-day totals (counts only).
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const T = jiti('../lib/server/internal-traffic.ts')

const rows = [
  { day: '2026-11-13', event: 'pageview', visitor_hash: 'a'.repeat(16) },
  { day: '2026-11-13', event: 'pageview', visitor_hash: 'a'.repeat(16) },
  { day: '2026-11-13', event: 'pageview', visitor_hash: 'b'.repeat(16) },
  { day: '2026-11-12', event: 'pageview', visitor_hash: 'a'.repeat(16) },
  { day: '2026-11-12', event: 'signup_completed', visitor_hash: null },
  { day: '2026-10-20', event: 'pageview', visitor_hash: 'c'.repeat(16) },
  { day: '2026-10-20', event: 'checkout_completed', visitor_hash: null },
]
test('windowTotals sums daily uniques and filters by day', () => {
  assert.deepEqual(T.windowTotals(rows, '2026-11-07'), { visits: 4, visitors: 3, signups: 1, checkouts: 0 })
  assert.deepEqual(T.windowTotals(rows, '2026-10-15'), { visits: 5, visitors: 4, signups: 1, checkouts: 1 })
})
test('loadTraffic pages site_events and returns only totals', async () => {
  let sel = null
  const p = { select: (s) => (sel = s, p), gte: () => p, order: () => p, range: async () => ({ data: rows, error: null }) }
  const out = await T.loadTraffic({ from: () => p }, Date.parse('2026-11-13T12:00:00Z'))
  assert.equal(sel, 'day, event, visitor_hash')
  assert.deepEqual(Object.keys(out), ['d7', 'd30'])
  assert.equal(out.d30.checkouts, 1)
  assert.equal(out.d7.visitors, 3)
})
