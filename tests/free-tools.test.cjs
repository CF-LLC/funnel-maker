const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const { FREE_TOOLS, FREE_TOOLS_CTA, freeToolPath, getFreeTool, freeToolJsonLd } = jiti('../lib/free-tools/registry.ts')
const sitemap = jiti('../app/sitemap.ts').default
const robots = jiti('../app/robots.ts').default
const { isProtectedPath } = jiti('../tools/registry.ts')
const inv = jiti('../lib/free-tools/invoice.ts')

test('free tools registry: unique slugs, complete SEO fields, each has a page', () => {
  const slugs = FREE_TOOLS.map((t) => t.slug)
  assert.equal(new Set(slugs).size, slugs.length)
  assert.ok(getFreeTool('invoice-generator'))
  for (const t of FREE_TOOLS) {
    assert.match(t.slug, /^[a-z0-9-]+$/)
    assert.ok(t.title && t.h1 && t.description && t.blurb && t.name, t.slug)
    assert.ok(t.description.length <= 170, `${t.slug} meta description too long`)
    assert.ok(t.title.toLowerCase().includes(t.h1.toLowerCase()), `${t.slug} title must contain the H1 keyword`)
    assert.ok(t.feeds.href.startsWith('/'), t.slug)
    assert.ok(fs.existsSync(path.join(root, 'app', 'free-tools', t.slug, 'page.tsx')), `${t.slug} page missing`)
    const ld = freeToolJsonLd(t, 'https://saasnation.site/')
    assert.equal(ld['@type'], 'WebApplication')
    assert.equal(ld.url, `https://saasnation.site${freeToolPath(t.slug)}`)
    assert.equal(ld.offers.price, '0')
  }
  assert.equal(FREE_TOOLS_CTA, 'Want this saved and automated? $12/mo or $99/yr')
})

test('sitemap lists /free-tools and every free tool; robots allows them and points to sitemap', () => {
  const urls = sitemap().map((e) => new URL(e.url).pathname)
  assert.ok(urls.includes('/free-tools'))
  for (const t of FREE_TOOLS) assert.ok(urls.includes(freeToolPath(t.slug)), t.slug)
  assert.equal(new Set(urls).size, urls.length)
  for (const u of urls) assert.equal(isProtectedPath(u), false, `${u} must be public`)
  const r = robots()
  const rules = [].concat(r.rules)
  assert.ok(rules.some((x) => x.userAgent === '*' && x.allow === '/'))
  assert.ok(!rules.some((x) => [].concat(x.disallow || []).some((d) => '/free-tools'.startsWith(d))))
  assert.match(r.sitemap, /\/sitemap\.xml$/)
})

test('middleware does not protect free tools for signed-out visitors', () => {
  assert.equal(isProtectedPath('/free-tools'), false)
  for (const t of FREE_TOOLS) assert.equal(isProtectedPath(freeToolPath(t.slug)), false)
})

test('free invoice maps to paid PDF shape and totals', () => {
  const f = inv.blankFreeInvoice('2026-10-28')
  assert.equal(f.dueDate, '2026-11-11')
  f.fromName = 'Acme'; f.toName = 'Client'; f.taxRate = '10'; f.currency = 'EUR'
  f.lines = [{ description: 'Design', quantity: '2', price: '150.50' }, { description: '', quantity: '1', price: '' }]
  const d = inv.toPreviewData(f)
  assert.equal(d.lines.length, 1)
  assert.equal(d.lines[0].unit_price_cents, 15050)
  assert.equal(d.tax_rate, 10)
  assert.equal(d.currency, 'EUR')
  assert.equal(inv.toPreviewData({ ...f, currency: 'XXX' }).currency, 'USD')
  assert.equal(inv.pdfFileName('INV/01 x'), 'invoice-INV_01_x.pdf')
})

test('free invoice generator never stores data', () => {
  const src = fs.readFileSync(path.join(root, 'components/free-tools/invoice-generator.tsx'), 'utf8') + fs.readFileSync(path.join(root, 'lib/free-tools/invoice.ts'), 'utf8')
  assert.doesNotMatch(src, /localStorage|sessionStorage|indexedDB|fetch\(|supabase|document\.cookie/)
})

const hr = jiti('../lib/free-tools/hourly-rate.ts')
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`)

test('hourly rate: hand-checked example', () => {
  // 75k take-home, 25% tax => profit 100k, taxes 25k; expenses 500/mo = 6k; pre-buffer 106k; +10% = 116.6k
  // 52-6 = 46 weeks * 40h * 50% = 920 billable hours => 126.7391.../hr
  const r = hr.calcRate({ income: 75000, incomePeriod: 'year', expensesMonthly: 500, taxPct: 25, hoursPerWeek: 40, weeksOff: 6, bufferPct: 10, billablePct: 50, projectHours: 20 })
  close(r.taxes, 25000); close(r.expenses, 6000); close(r.preBuffer, 106000); close(r.buffer, 10600); close(r.gross, 116600)
  assert.equal(r.workingWeeks, 46); close(r.billableHours, 920)
  close(r.hourly, 116600 / 920); close(r.day, (116600 / 920) * 8); close(r.project, (116600 / 920) * 20)
  close(r.monthlyGross, 116600 / 12)
  assert.equal(hr.roundUp(r.hourly), 127)
})

test('hourly rate: monthly income, zero tax/buffer, 100% billable', () => {
  const r = hr.calcRate({ income: 5000, incomePeriod: 'month', expensesMonthly: 0, taxPct: 0, hoursPerWeek: 30, weeksOff: 2, bufferPct: 0, billablePct: 100 })
  close(r.gross, 60000); close(r.billableHours, 1500); close(r.hourly, 40); close(r.day, 320); close(r.project, 800)
})

test('hourly rate: billing less of your time raises the rate proportionally', () => {
  const base = { income: 60000, incomePeriod: 'year', expensesMonthly: 200, taxPct: 30, hoursPerWeek: 40, weeksOff: 4, bufferPct: 15 }
  const a = hr.calcRate({ ...base, billablePct: 100 }), b = hr.calcRate({ ...base, billablePct: 50 })
  close(b.hourly, a.hourly * 2); close(a.gross, b.gross)
})

test('hourly rate: guards against bad input', () => {
  const r = hr.calcRate({ income: NaN, incomePeriod: 'year', expensesMonthly: -5, taxPct: 150, hoursPerWeek: 0, weeksOff: 60, bufferPct: -1, billablePct: 50 })
  assert.equal(r.hourly, 0); assert.ok(Number.isFinite(r.gross)); assert.equal(r.workingWeeks, 1)
  const t = hr.calcRate({ income: 10000, incomePeriod: 'year', expensesMonthly: 0, taxPct: 100, hoursPerWeek: 10, weeksOff: 0, bufferPct: 0, billablePct: 100 })
  assert.ok(Number.isFinite(t.hourly)); close(t.taxes, 90000) // tax clamped to 90%
  assert.equal(hr.roundUp(40.01), 41); assert.equal(hr.roundUp(40), 40); assert.equal(hr.roundUp(40.004), 40)
})

test('hourly rate calculator never stores data', () => {
  const src = fs.readFileSync(path.join(root, 'components/free-tools/hourly-rate-calculator.tsx'), 'utf8') + fs.readFileSync(path.join(root, 'lib/free-tools/hourly-rate.ts'), 'utf8')
  assert.doesNotMatch(src, /localStorage|sessionStorage|indexedDB|fetch\(|supabase|document\.cookie/)
})

test('canonical site URL is the apex, never the funnels. app host', () => {
  const { canonicalSiteUrl, SITE_URL } = jiti('../lib/free-tools/site-url.ts')
  assert.equal(canonicalSiteUrl(undefined), 'https://saasnation.site')
  assert.equal(canonicalSiteUrl(''), 'https://saasnation.site')
  assert.equal(canonicalSiteUrl('https://funnels.saasnation.site/'), 'https://saasnation.site')
  assert.equal(canonicalSiteUrl('http://www.saasnation.site'), 'https://saasnation.site')
  assert.equal(canonicalSiteUrl('not a url'), 'https://saasnation.site')
  const old = process.env.NEXT_PUBLIC_APP_URL
  process.env.NEXT_PUBLIC_APP_URL = 'https://funnels.saasnation.site'
  try { assert.equal(canonicalSiteUrl(), canonicalSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)) } finally { if (old === undefined) delete process.env.NEXT_PUBLIC_APP_URL; else process.env.NEXT_PUBLIC_APP_URL = old }
  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    assert.equal(SITE_URL, 'https://saasnation.site')
    for (const e of sitemap()) assert.ok(e.url.startsWith('https://saasnation.site'), e.url)
    assert.equal(robots().sitemap, 'https://saasnation.site/sitemap.xml')
  }
  const layout = fs.readFileSync(path.join(root, 'app/layout.tsx'), 'utf8')
  assert.match(layout, /metadataBase: new URL\(SITE_URL\)/)
})

const utm = jiti('../lib/free-tools/utm.ts')
const P = { source: 'google', medium: 'cpc', campaign: 'spring_sale' }

test('utm: normalizes bare domains and builds params in order', () => {
  const r = utm.buildUtmUrl('example.com', P)
  assert.deepEqual(r, { ok: true, url: 'https://example.com/?utm_source=google&utm_medium=cpc&utm_campaign=spring_sale' })
  assert.equal(utm.buildUtmUrl('  http://Example.com/a  ', P).url, 'http://example.com/a?utm_source=google&utm_medium=cpc&utm_campaign=spring_sale')
  assert.equal(utm.buildUtmUrl('example.com:8080/x', P).url, 'https://example.com:8080/x?utm_source=google&utm_medium=cpc&utm_campaign=spring_sale')
})

test('utm: keeps existing query and hash, replaces existing utm_ keys', () => {
  const r = utm.buildUtmUrl('https://ex.com/p?ref=home&utm_source=old#signup', { ...P, content: 'hero' })
  assert.equal(r.url, 'https://ex.com/p?ref=home&utm_source=google&utm_medium=cpc&utm_campaign=spring_sale&utm_content=hero#signup')
  const u = new URL(r.url)
  assert.equal(u.hash, '#signup'); assert.equal(u.searchParams.get('ref'), 'home'); assert.equal(u.searchParams.getAll('utm_source').length, 1)
  assert.ok(!r.url.includes('utm_term'), 'empty optional params are omitted')
})

test('utm: encodes values safely; tidy option normalizes naming', () => {
  const raw = utm.buildUtmUrl('ex.com', { source: 'News Letter', medium: 'e&mail', campaign: 'Black Friday #1', term: 'a=b' })
  const u = new URL(raw.url)
  assert.equal(u.searchParams.get('utm_source'), 'News Letter'); assert.equal(u.searchParams.get('utm_medium'), 'e&mail')
  assert.equal(u.searchParams.get('utm_campaign'), 'Black Friday #1'); assert.equal(u.searchParams.get('utm_term'), 'a=b'); assert.equal(u.hash, '')
  assert.ok(!/[ #]/.test(raw.url.split('?')[1]))
  assert.equal(utm.tidy('  Black-Friday  Sale!! '), 'black_friday_sale')
  assert.equal(utm.buildUtmUrl('ex.com', { source: 'Face Book', medium: 'Paid Social', campaign: 'Q4 Launch' }, { tidy: true }).url, 'https://ex.com/?utm_source=face_book&utm_medium=paid_social&utm_campaign=q4_launch')
})

test('utm: rejects invalid URLs and missing required fields', () => {
  for (const bad of ['', '   ', 'not a url', 'javascript:alert(1)', 'mailto:a@b.com', 'ftp://ex.com', 'localhostish', 'http://', 'https://exa mple.com']) {
    assert.equal(utm.buildUtmUrl(bad, P).ok, false, bad)
  }
  assert.equal(utm.buildUtmUrl('ex.com', { ...P, source: '' }).ok, false)
  assert.equal(utm.buildUtmUrl('ex.com', { ...P, medium: ' ' }).ok, false)
  assert.equal(utm.buildUtmUrl('ex.com', { ...P, campaign: '' }).ok, false)
  assert.equal(utm.buildUtmUrl('ex.com', { ...P, source: '!!!' }, { tidy: true }).ok, false)
})

test('utm: build several uses one campaign and per-line source/medium', () => {
  const rows = utm.buildMany('ex.com/l', 'google/cpc\n\n Newsletter \nx/social', { source: '', medium: 'email', campaign: 'launch' }, { tidy: true })
  assert.equal(rows.length, 3)
  assert.deepEqual(rows.map((r) => r.result.url), [
    'https://ex.com/l?utm_source=google&utm_medium=cpc&utm_campaign=launch',
    'https://ex.com/l?utm_source=newsletter&utm_medium=email&utm_campaign=launch',
    'https://ex.com/l?utm_source=x&utm_medium=social&utm_campaign=launch',
  ])
  for (const pr of utm.UTM_PRESETS) assert.equal(pr.source + pr.medium, utm.tidy(pr.source) + utm.tidy(pr.medium))
})

test('utm builder never stores data', () => {
  const src = fs.readFileSync(path.join(root, 'components/free-tools/utm-builder.tsx'), 'utf8') + fs.readFileSync(path.join(root, 'lib/free-tools/utm.ts'), 'utf8')
  assert.doesNotMatch(src, /localStorage|sessionStorage|indexedDB|fetch\(|supabase|document\.cookie/)
})
