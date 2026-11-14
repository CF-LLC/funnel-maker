const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const { FREE_TEMPLATES, freeTemplatePath, FREE_TEMPLATES_PATH } = jiti('../lib/landing/free-templates.ts')
const { LANDINGS } = jiti('../lib/landing/registry.ts')
const sitemap = jiti('../app/sitemap.ts').default
const { isProtectedPath } = jiti('../tools/registry.ts')
const og = jiti('../lib/og/pages.ts')

test('free template pages: unique, in sitemap, public, have share cards and honest copy', () => {
  const urls = sitemap().map((e) => new URL(e.url).pathname)
  const cards = og.ogCards().map((c) => c.path)
  assert.equal(new Set(FREE_TEMPLATES.map((t) => t.slug)).size, FREE_TEMPLATES.length)
  assert.equal(new Set(FREE_TEMPLATES.map((t) => t.title)).size, FREE_TEMPLATES.length)
  for (const p of [FREE_TEMPLATES_PATH, ...FREE_TEMPLATES.map((t) => freeTemplatePath(t.slug))]) {
    assert.ok(urls.includes(p), p); assert.equal(isProtectedPath(p), false, p); assert.ok(cards.includes(p), p)
  }
  for (const t of FREE_TEMPLATES) {
    assert.ok(t.description.length <= 170, t.slug); assert.ok(t.title.length <= 65, t.slug)
    assert.ok(t.templates.length > 0 && t.templates.every((b) => b.body.length > 40), t.slug)
    if (t.landing) assert.ok(LANDINGS.some((l) => l.slug === t.landing), t.landing)
  }
  const src = fs.readFileSync(path.join(root, 'lib/landing/free-templates.ts'), 'utf8')
  assert.doesNotMatch(src, /\$(?!12\b|99\b|29\b|249\b|\[)\d/) // no prices besides the real plan prices
  assert.doesNotMatch(src, /\d+% of (our )?(users|customers)|trusted by|rated \d/i)
})

test('every paid tool has a free template page whose tool name and tagline match the registry', () => {
  const reg = jiti('../tools/registry.ts')
  const tools = reg.TOOL_REGISTRY
  for (const tool of tools) {
    if (tool.id === 'linkinbio') continue
    const t = FREE_TEMPLATES.find((x) => x.tool === tool.name)
    assert.ok(t, `missing template for ${tool.name}`); assert.equal(t.tagline, tool.tagline, tool.name)
  }
})
