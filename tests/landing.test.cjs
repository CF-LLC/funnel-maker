const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const { LANDINGS, landingPath, COMPARES, comparePath } = jiti('../lib/landing/registry.ts')
const sitemap = jiti('../app/sitemap.ts').default
const { isProtectedPath } = jiti('../tools/registry.ts')

test('landing + compare pages: in sitemap, public, honest copy', () => {
  const urls = sitemap().map((e) => new URL(e.url).pathname)
  const all = [...LANDINGS.map((l) => landingPath(l.slug)), ...COMPARES.map((c) => comparePath(c.slug))]
  assert.equal(new Set(LANDINGS.map((l) => l.slug)).size, LANDINGS.length)
  for (const u of all) { assert.ok(urls.includes(u), u); assert.equal(isProtectedPath(u), false, u) }
  const src = [fs.readFileSync(path.join(root, 'lib/landing/registry.ts'), 'utf8'), fs.readFileSync(path.join(root, "app/compare/[slug]/page.tsx"), "utf8")].join('\n')
  assert.doesNotMatch(src, /within 24|24 ?hours/i)
  for (const l of LANDINGS) assert.ok(l.description.length <= 170, l.slug)
})

test('/free-tools/late-invoice redirects permanently to the kit; kit uses draft title', async () => {
  const cfg = (await import(path.join(root, 'next.config.mjs'))).default
  const r = (await cfg.redirects()).find((x) => x.source === '/free-tools/late-invoice')
  assert.deepEqual([r.destination, r.permanent], ['/free-tools/late-invoice-kit', true])
  const { getFreeTool } = jiti('../lib/free-tools/registry.ts')
  assert.equal(getFreeTool('late-invoice-kit').title, 'Free Late Invoice Fee Calculator + Reminder Emails (No Signup) | SaaS Nation')
})
