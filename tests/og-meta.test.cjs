const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const og = jiti('../lib/og/pages.ts')
const { FREE_TOOLS } = jiti('../lib/free-tools/registry.ts')
const { LANDINGS, COMPARES } = jiti('../lib/landing/registry.ts')

test('a share card exists for home, pricing, free tools, each free tool, /tools/* and /compare/*', () => {
  const paths = og.ogCards().map((c) => c.path)
  for (const p of ['/', '/pricing', '/free-tools', ...FREE_TOOLS.map((t) => `/free-tools/${t.slug}`), ...LANDINGS.map((l) => `/tools/${l.slug}`), ...COMPARES.map((c) => `/compare/${c.slug}`)]) assert.ok(paths.includes(p), p)
  assert.equal(new Set(paths).size, paths.length)
})

test('og image paths round-trip', () => {
  assert.equal(og.ogImagePath('/'), '/og/home.png')
  assert.equal(og.ogImagePath('/free-tools/utm-builder'), '/og/free-tools/utm-builder.png')
  assert.equal(og.ogCardForSegments(['home.png']).path, '/')
  assert.equal(og.ogCardForSegments(['free-tools', 'utm-builder.png']).path, '/free-tools/utm-builder')
  assert.equal(og.ogCardForSegments(['nope.png']), null)
})

test('pageMeta sets canonical, og and summary_large_image twitter card', () => {
  const m = og.pageMeta({ title: 'T', description: 'D', path: '/pricing' })
  assert.equal(m.alternates.canonical, '/pricing')
  assert.equal(m.openGraph.images[0].url, '/og/pricing.png'); assert.equal(m.openGraph.images[0].width, 1200); assert.equal(m.openGraph.images[0].height, 630)
  assert.equal(m.twitter.card, 'summary_large_image')
})

test('descriptions are current and honest', () => {
  const all = [og.HOME_DESCRIPTION, og.PRICING_DESCRIPTION, og.FREE_TOOLS_DESCRIPTION, ...og.ogCards().map((c) => c.title + ' ' + c.subtitle)].join(' ')
  assert.ok(!/Funnel Maker, Invoices and Link-in-bio/.test(all))
  assert.ok(!/24 ?h|24 hours/i.test(all))
  assert.match(og.PRICING_DESCRIPTION, /\$12\/mo or \$99\/yr/); assert.match(og.PRICING_DESCRIPTION, /\$29\/mo or \$249\/yr/)
  const layout = fs.readFileSync(path.join(root, 'app/layout.tsx'), 'utf8')
  assert.ok(!/Funnel Maker, Invoices and Link-in-bio/.test(layout)); assert.match(layout, /metadataBase/)
  const tools = fs.readdirSync(path.join(root, 'tools')).filter((d) => fs.existsSync(path.join(root, 'tools', d, 'tool.ts')))
  assert.match(og.HOME_DESCRIPTION, new RegExp(`\\b${tools.length} simple tools`))
})
