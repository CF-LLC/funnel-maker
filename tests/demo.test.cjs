const test = require('node:test'); const assert = require('node:assert')
const fs = require('node:fs'); const path = require('node:path')
const src = fs.readFileSync(path.join(__dirname, '../lib/demo.ts'), 'utf8')
test('demo helper reads DEMO_USER_IDS', () => {
  assert.match(src, /DEMO_USER_IDS/)
})
for (const f of ['app/api/f/[slug]/lead/route.ts', 'app/api/forms/submit/route.ts', 'app/api/testimonials/submit/route.ts', 'app/api/proposals/respond/route.ts']) {
  test(`${f} short-circuits demo accounts before storing`, () => {
    const s = fs.readFileSync(path.join(__dirname, '..', f), 'utf8')
    assert.match(s, /demo: true/)
  })
}
test('banner says Start building and links to sign-up', () => {
  const s = fs.readFileSync(path.join(__dirname, '../components/demo-banner.tsx'), 'utf8')
  assert.match(s, /Demo page made with SaaS Nation/); assert.match(s, /Start building/); assert.match(s, /\/auth\/register/)
})
for (const f of ['app/f/[slug]/page.tsx', 'app/f/[slug]/thanks/page.tsx', 'app/public/[funnelId]/page.tsx']) {
  test(`${f} renders the demo banner server-side`, () => {
    const s = fs.readFileSync(path.join(__dirname, '..', f), 'utf8')
    assert.doesNotMatch(s, /'use client'/); assert.match(s, /isDemoFunnel/); assert.match(s, /<DemoBanner \/>/)
  })
}
test('lead route refuses demo funnels before the bot check', () => {
  const s = fs.readFileSync(path.join(__dirname, '../app/api/f/[slug]/lead/route.ts'), 'utf8')
  const d = s.indexOf('isDemoFunnel({ slug })'), t = s.indexOf('verifyTurnstile((')
  assert.ok(d > 0 && t > d); assert.match(s, /status: 403/)
})
