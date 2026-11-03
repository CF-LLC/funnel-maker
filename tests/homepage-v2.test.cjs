const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')
const v2 = jiti('../lib/home/v2.ts')

test('flag off = old homepage; flag on = v2; only the global enabled bit counts', () => {
  assert.equal(v2.HOMEPAGE_V2_FLAG, 'homepage_v2')
  assert.equal(v2.homepageV2On(null), false)
  assert.equal(v2.homepageV2On({ enabled: false }), false)
  assert.equal(v2.homepageV2On({ enabled: false, allow_users: ['x'] }), false)
  assert.equal(v2.homepageV2On({ enabled: true }), true)
  const page = read('app/page.tsx')
  assert.match(page, /if \(await isHomepageV2Enabled\(\)\) return <HomeV2Page/)
  // Old page body is still there after the gate, with its hero, rows and SEO.
  for (const s of ['Simple online software tools for small business', '<ToolPicker', 'pageMeta({ title: HOME_TITLE', 'organizationLd(), websiteLd()', 'revalidate = 60']) assert.ok(page.includes(s), s)
  assert.doesNotMatch(page, /noindex|robots/)
  const flag = read('lib/home/v2-flag.ts')
  assert.match(flag, /eq\('key', HOMEPAGE_V2_FLAG\)/)
  assert.match(flag, /catch \{\s*return false/)
})

test('?hp=2 preview: only "/" with hp=2, rewrites to a noindex route with canonical /', () => {
  assert.equal(v2.isHomepageV2Preview('/', '2'), true)
  assert.equal(v2.isHomepageV2Preview('/', null), false)
  assert.equal(v2.isHomepageV2Preview('/', '1'), false)
  assert.equal(v2.isHomepageV2Preview('/pricing', '2'), false)
  const mw = read('middleware.ts')
  assert.match(mw, /isHomepageV2Preview\(request\.nextUrl\.pathname, request\.nextUrl\.searchParams\.get\('hp'\)\)/)
  assert.match(mw, /NextResponse\.rewrite/)
  const prev = read('app/home-v2/page.tsx')
  assert.match(prev, /robots: \{ index: false, follow: false \}/)
  assert.match(prev, /path: '\/'/)
  assert.doesNotMatch(read('app/sitemap.ts'), /home-v2/)
})

function allCopy(trial) {
  const p = v2.pricingLine(trial)
  return JSON.stringify([v2.JOBS, v2.HERO, v2.FITS, p, v2.faqs(trial), v2.DEMOS, v2.FINAL]) + read('components/home/v2/home-v2.tsx')
}

test('banned strings absent from v2 copy', () => {
  for (const trial of [true, false]) {
    const s = allCopy(trial)
    for (const bad of ['Client list', 'CRM', 'Client page', 'Doc Chaser', 'Trusted by', 'customers']) assert.ok(!s.includes(bad), bad)
  }
  // No tool-count claim on pricing or FAQ (the only number-of-things allowed is "Six free tools").
  const priceAndFaq = JSON.stringify([v2.pricingLine(true), v2.faqs(true)])
  assert.doesNotMatch(priceAndFaq.replace('Six free tools', ''), /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\+? (paid |pro |)tools\b/i)
  assert.match(JSON.stringify(v2.faqs(true)), /Six free tools need no signup/)
})

test('"six free tools" matches the real free tool list', () => {
  const { FREE_TOOLS } = jiti('../lib/free-tools/registry.ts')
  assert.equal(FREE_TOOLS.length, 6)
  assert.ok(FREE_TOOLS.some((t) => t.slug === 'late-invoice-kit'))
})

test('pricing is the locked constants', () => {
  const p = v2.pricingLine(true)
  assert.match(p.head, /\$29\/mo or \$249\/yr/)
  assert.match(p.body, /\$12\/mo or \$99\/yr/)
  assert.doesNotMatch(v2.pricingLine(false).body, /trial/)
})

test('jobs use the final names and hide tools that are not live', () => {
  assert.deepEqual(v2.JOBS.map((j) => j.title), ['Get clients', 'Win work', 'Deliver', 'Get paid'])
  const off = v2.jobsFor({})
  assert.ok(!JSON.stringify(off).includes('Clients"'))
  assert.ok(!JSON.stringify(off).includes('Payment checker'))
  const on = v2.jobsFor({ crm: true, portal: true, paid: true })
  assert.ok(on[1].items.some((i) => i.name === 'Clients'))
  assert.match(JSON.stringify(v2.FITS), /one Clients page/)
})

test('tracking events wired with the exact names via trackEvent and accepted by the beacon', () => {
  const { CLIENT_EVENTS, parseBeacon } = jiti('../lib/site-events/core.ts')
  const src = read('components/home/v2/home-v2.tsx') + read('components/home/v2/tracked.tsx')
  assert.match(read('components/home/v2/tracked.tsx'), /from '@\/lib\/site-events\/client'/)
  for (const e of v2.HOME_EVENTS) {
    assert.ok(src.includes(`'${e}'`) || src.includes(`"${e}"`), e)
    assert.ok(CLIENT_EVENTS.includes(e), e)
    assert.equal(parseBeacon({ event: e, path: '/', tool: 'get_clients' }, ['saasnation.site']).event, e)
  }
})

test('SEO: "/" with homepage_v2 on is indexable with canonical https://saasnation.site/; preview stays noindex', () => {
  const page = read('app/page.tsx')
  const layout = read('app/layout.tsx')
  for (const s of [page, layout, read('components/home/v2/page-shell.tsx'), read('components/home/v2/home-v2.tsx')]) assert.doesNotMatch(s, /noindex|robots\s*:/)
  assert.match(page, /pageMeta\(\{ title: HOME_TITLE, description: HOME_DESCRIPTION, path: '\/'/)
  assert.match(layout, /metadataBase: new URL\(SITE_URL\)/)
  const { canonicalSiteUrl } = jiti('../lib/free-tools/site-url.ts')
  assert.equal(new URL('/', canonicalSiteUrl(undefined)).href, 'https://saasnation.site/')
  const { pageMeta } = jiti('../lib/og/pages.ts')
  const m = pageMeta({ title: 't', description: 'd', path: '/', absoluteTitle: true })
  assert.equal(m.alternates.canonical, '/')
  assert.equal(m.robots, undefined)
  assert.match(read('app/home-v2/page.tsx'), /robots: \{ index: false, follow: false \}/)
})

test('free tools section says "six free tools" in visible copy', () => {
  const src = read('components/home/v2/home-v2.tsx')
  assert.match(src, />Try one of our six free tools</)
  assert.match(src, />No signup, nothing stored\.</)
})
