// Run with: npm test  (node:test + jiti to load the TypeScript modules directly)
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const jiti = require('jiti')(__filename, { alias: { '@': path.resolve(__dirname, '..') } })

const { templates, themeFor } = jiti('../data/templates.ts')
const { safeHttpsUrl, safeCssColor } = jiti('../lib/url-safety.ts')
const css = fs.readFileSync(path.join(__dirname, '../app/globals.css'), 'utf8')

test('template ids are unique and there are at least 4 effect templates', () => {
  const ids = templates.map((t) => t.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(templates.filter((t) => t.theme !== 'classic').length >= 4)
})

test('every template is well formed', () => {
  for (const t of templates) {
    assert.ok(t.name && t.description && t.effect && t.swatch, t.id)
    assert.ok(t.steps.length >= 2, `${t.id} has steps`)
    const sIds = t.steps.map((s) => s.id)
    assert.equal(new Set(sIds).size, sIds.length, `${t.id} step ids unique`)
    t.steps.forEach((s, i) => assert.equal(s.order, i, `${t.id} step order`))
    assert.ok(t.steps.some((s) => s.type === 'lead-capture' || s.type === 'sales'), `${t.id} converts`)
    assert.ok(t.steps.some((s) => s.type === 'thank-you'), `${t.id} has a thank-you page`)
    assert.equal(safeCssColor(t.swatch) !== undefined || /gradient/.test(t.swatch), true)
  }
})

test('new effect templates never include payment links', () => {
  for (const t of templates.filter((x) => x.theme !== 'classic')) {
    for (const s of t.steps) {
      assert.notEqual(s.type, 'sales', `${t.id} should not be a sales template`)
      assert.equal(s.paymentLink, undefined)
    }
  }
})

test('sample links in templates pass the https check', () => {
  for (const t of templates) for (const s of t.steps) for (const l of s.affiliateLinks || []) assert.ok(safeHttpsUrl(l.url), l.url)
})

test('themeFor falls back to classic', () => {
  assert.equal(themeFor('starfield-launch'), 'starfield')
  assert.equal(themeFor('nope'), 'classic')
  assert.equal(themeFor(null), 'classic')
})

test('every theme has CSS and reduced-motion handling exists', () => {
  for (const th of new Set(templates.map((t) => t.theme))) assert.match(css, new RegExp(`\\.fm-theme-${th}\\b`))
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(css, /\.fm-reveal \{ opacity: 1; transform: none; \}/)
})
