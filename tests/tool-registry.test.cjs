const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const { TOOL_REGISTRY, TOOL_IDS, ACCESS_KEYS, isProtectedPath, getTool } = jiti('../tools/registry.ts')
const { parsePriceMap } = jiti('../lib/stripe-webhook.ts')
const { TOOLS, isAccessTool } = jiti('../lib/access.ts')

test('registry entries are complete and unique', () => {
  assert.deepEqual(new Set(TOOL_IDS).size, TOOL_IDS.length)
  for (const t of TOOL_REGISTRY) {
    for (const k of ['id', 'name', 'route', 'accessKey', 'tagline', 'priceLabel']) assert.ok(t[k], `${t.id}.${k}`)
    assert.ok(t.nav.length > 0); assert.ok(t.route.startsWith('/'))
    assert.ok(isProtectedPath(t.route), `${t.id} route protected`)
  }
  assert.ok(TOOL_IDS.includes('funnels') && TOOL_IDS.includes('invoices'))
  assert.equal(getTool('invoices').route, '/invoices')
})

test('access + price map derive from the registry; all access stays', () => {
  assert.deepEqual([...TOOLS], TOOL_IDS)
  assert.deepEqual(ACCESS_KEYS, [...TOOL_IDS, 'all'])
  assert.ok(isAccessTool('all') && !isAccessTool('nope'))
  assert.equal(parsePriceMap(JSON.stringify({ price_1: { tool: 'invoices' } })).price_1.tool, 'invoices')
  assert.throws(() => parsePriceMap(JSON.stringify({ price_1: { tool: 'nope' } })))
  assert.equal(parsePriceMap(JSON.stringify({ price_1UVtgDDs9LwkRsZNNTWBit05: { tool: 'portal', plan: 'monthly' } })).price_1UVtgDDs9LwkRsZNNTWBit05.tool, 'portal')
  assert.equal(parsePriceMap(JSON.stringify({ price_1UVujGDs9LwkRsZN2jodVk9P: { tool: 'changelog', plan: 'monthly' } })).price_1UVujGDs9LwkRsZN2jodVk9P.tool, 'changelog')
  assert.equal(parsePriceMap(JSON.stringify({ price_1UVujPDs9LwkRsZN1G7ZtT8s: { tool: 'approvals', plan: 'yearly' } })).price_1UVujPDs9LwkRsZN1G7ZtT8s.tool, 'approvals')
})

test('existing URLs still protected/public as before', () => {
  for (const p of ['/dashboard', '/dashboard/funnels/x', '/invoices', '/invoices/new']) assert.ok(isProtectedPath(p), p)
  for (const p of ['/', '/pricing', '/f/slug', '/i/token', '/invoicesx', '/healthz']) assert.ok(!isProtectedPath(p), p)
  assert.ok(fs.existsSync(path.join(root, 'docs/ADDING_A_TOOL.md')))
})
