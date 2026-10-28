const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const { TOOL_REGISTRY, PUBLIC_TOOLS, HOME_ROWS, toolsInRow, HERO_TOOL_ID } = jiti('../tools/registry.ts')

test('every tool has poster/card metadata and a static screenshot in /public', () => {
  for (const t of TOOL_REGISTRY) {
    const s = t.showcase
    assert.ok(s.cardTagline && s.colors.from && s.colors.to && s.colors.accent, t.id)
    assert.ok(s.shot.startsWith('/shots/') && fs.existsSync(path.join(root, 'public', s.shot)), `${t.id} shot`)
  }
})

test('home rows: All tools, coaches, creators, Get paid (Invoices + Proposals); no Coming soon', () => {
  assert.deepEqual(HOME_ROWS.map((r) => r.id), ['all', 'coaches', 'creators', 'get-paid', 'everyone'])
  assert.equal(toolsInRow('all').length, PUBLIC_TOOLS.length)
  assert.deepEqual(toolsInRow('get-paid').map((t) => t.id).sort(), ['invoices', 'proposals'])
  assert.ok(!HOME_ROWS.some((r) => /coming/i.test(r.title)))
  assert.equal(HERO_TOOL_ID, 'funnels')
})

test('card taglines match the approved copy', () => {
  const want = { funnels: 'Launch a page that sells, in minutes.', invoices: 'Bill clients. Get paid. Done.', linkinbio: 'One link for everything you sell.',
    forms: 'Know your client before the first call.', proposals: 'Send a quote, get a yes, get paid.', testimonials: 'Let happy clients sell for you.', booking: 'Let clients pick a time without the back-and-forth.',
    dataremoval: 'Find and opt out of people-search sites, step by step.', crm: 'Every client from every tool, in one list.', emaillist: 'Grow your list. Send emails people want.', downloads: 'Sell your downloads. Get paid in your own Stripe.' }
  for (const t of TOOL_REGISTRY) assert.equal(t.showcase.cardTagline, want[t.id])
})
