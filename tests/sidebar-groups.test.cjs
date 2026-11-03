// PR 4 (SaaS Nation rework): dashboard sidebar grouped by job, behind workspace_v2.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const G = jiti('../tools/groups.ts')
const R = jiti('../tools/registry.ts')
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')

test('group names and order are exact', () => {
  assert.deepEqual([...G.SIDEBAR_GROUPS], ['Get clients', 'Win work', 'Deliver', 'Get paid', 'Run the business'])
})

test('every registry tool is in exactly one known group, and no extra ids', () => {
  const ids = R.TOOL_REGISTRY.map((t) => t.id)
  for (const id of ids) assert.ok(G.SIDEBAR_GROUPS.includes(G.TOOL_GROUP[id]), `${id} has a group`)
  assert.deepEqual(Object.keys(G.TOOL_GROUP).sort(), [...ids].sort())
  const all = R.TOOL_REGISTRY
  const nav = G.groupedNav(all, ['all'])
  const seen = nav.flatMap((s) => [...new Set(s.items.map((i) => i.toolId))])
  assert.equal(seen.length, new Set(seen).size, 'no tool in two groups')
  assert.equal(seen.length, ids.length)
})

test('sections come out in order; owned tools are normal links', () => {
  const nav = G.groupedNav(R.TOOL_REGISTRY, ['all'])
  assert.deepEqual(nav.map((s) => s.name), [...G.SIDEBAR_GROUPS])
  assert.ok(nav.every((s) => s.items.every((i) => !i.locked && i.href !== '/pricing')))
  assert.ok(nav[0].items.some((i) => i.href === '/funnels/templates'), 'all funnel nav entries kept')
})

test('locked tools stay listed with a lock, plain price and /pricing link', () => {
  const nav = G.groupedNav(R.TOOL_REGISTRY, ['invoices'])
  const items = nav.flatMap((s) => s.items)
  const inv = items.find((i) => i.toolId === 'invoices')
  assert.equal(inv.locked, false); assert.equal(inv.href, '/invoices')
  const prop = items.find((i) => i.toolId === 'proposals')
  assert.equal(prop.locked, true); assert.equal(prop.price, '$12/mo'); assert.equal(prop.href, '/pricing')
  assert.equal(items.find((i) => i.toolId === 'linkinbio').locked, false, 'included tool unlocked by any plan')
  const none = G.groupedNav(R.TOOL_REGISTRY, []).flatMap((s) => s.items)
  assert.ok(none.every((i) => i.locked))
  assert.equal(none.find((i) => i.toolId === 'linkinbio').price, 'Free with any tool')
  assert.equal(none.filter((i) => i.toolId === 'funnels').length, 1, 'one row per locked tool')
})

test('layout: flag off keeps the old flat list; v2 only via /api/me/sidebar', () => {
  const src = read('app/dashboard/layout.tsx')
  assert.match(src, /v2Access === null \? navigation\.map/)
  assert.match(src, /fetch\('\/api\/me\/sidebar'/)
  const api = read('app/api/me/sidebar/route.ts')
  assert.match(api, /isUserFlagEnabled\('workspace_v2', user\.id\)/)
  assert.doesNotMatch(api, /\.(insert|update|delete|upsert)\(/)
})
