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
