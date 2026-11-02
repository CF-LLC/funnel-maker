const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const S = jiti('../lib/seo/schema.ts')
const { COMPARES, LANDINGS, faqJsonLd } = jiti('../lib/landing/registry.ts')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')

test('schema prices match the real plan prices', () => {
  assert.deepEqual(S.PRICES, { toolMonthly: '12.00', toolYearly: '99.00', allMonthly: '29.00', allYearly: '249.00' })
  const p = JSON.parse(S.ldHtml(S.pricingLd('d')))
  assert.deepEqual(p.offers.map((o) => o.price), ['12.00', '99.00', '29.00', '249.00'])
  for (const o of p.offers) assert.equal(o.priceCurrency, 'USD')
  const pricing = read('app/pricing/page.tsx')
  for (const s of ['$12/mo', '$99/yr', '$29/mo', '$249/yr']) assert.ok(pricing.includes(s), s)
})

test('tool JSON-LD: offers for paid tools, none for included-only Link-in-bio', () => {
  const a = S.softwareAppLd({ name: 'SaaS Nation Invoices', description: 'x', path: '/tools/x' })
  assert.deepEqual(a.offers.map((o) => [o.price, o.priceSpecification.unitCode]), [['12.00', 'MON'], ['99.00', 'ANN']])
  assert.equal(S.softwareAppLd({ name: 'L', description: 'x', path: '/tools/l', includedOnly: true }).offers, undefined)
  assert.ok(read('app/tools/[slug]/page.tsx').includes("includedOnly: l.tool === 'Link-in-bio'"))
})

test('org, website, breadcrumbs parse; ldHtml escapes <', () => {
  for (const x of [S.organizationLd(), S.websiteLd(), S.breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'A', path: '/tools/a' }])]) JSON.parse(S.ldHtml(x))
  const b = S.breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'A', path: '/tools/a' }])
  assert.deepEqual(b.itemListElement.map((i) => [i.position, i.item]), [[1, 'https://saasnation.site'], [2, 'https://saasnation.site/tools/a']])
  assert.equal(S.organizationLd().legalName, 'CF LLC')
  assert.ok(!S.ldHtml({ a: '</script>' }).includes('</'))
  assert.ok(read('app/page.tsx').includes('organizationLd(), websiteLd()'))
})

test('FAQ JSON-LD is built from the same visible FAQ objects (exact text)', () => {
  const shell = read('components/landing/landing-shell.tsx')
  assert.ok(shell.includes('faqJsonLd(faqs)') && shell.includes('{f.q}') && shell.includes('{f.a}'))
  for (const c of COMPARES) { const ld = faqJsonLd(c.faqs); assert.deepEqual(ld.mainEntity.map((m) => [m.name, m.acceptedAnswer.text]), c.faqs.map((f) => [f.q, f.a])) }
  const pricing = read('app/pricing/page.tsx'); assert.ok(pricing.includes('faq.map(([q, a])') && pricing.includes('faqLdFor(faq)'))
})

test('comparison pages: unique, link only to real landings, no competitor prices or numbers about them', () => {
  assert.ok(COMPARES.length >= 4)
  assert.equal(new Set(COMPARES.map((c) => c.slug)).size, COMPARES.length)
  const slugs = new Set(LANDINGS.map((l) => l.slug))
  for (const c of COMPARES) {
    for (const [s] of c.links) assert.ok(slugs.has(s), `${c.slug} -> ${s}`)
    assert.ok(c.description.length <= 170, c.slug)
    const text = [c.intro, ...c.rows.flat(), c.description].join(' ')
    const dollars = text.match(/\$\d+/g) || []
    for (const d of dollars) assert.ok(['$12', '$29', '$99', '$249'].includes(d), `${c.slug}: ${d}`)
    assert.doesNotMatch(text, /\d+%|free plan|cheaper than|costs? less than/i)
  }
  for (const s of ['saas-nation-vs-honeybook-dubsado', 'saas-nation-vs-gumroad-payhip', 'saas-nation-vs-mailchimp-convertkit']) assert.ok(COMPARES.find((c) => c.slug === s), s)
})

test('Terms matches Refund: access turned on automatically after payment', () => {
  const t = read('app/terms/page.tsx')
  assert.doesNotMatch(t, /usually the same day/)
  assert.match(t, /turned on automatically right after your payment/)
})
