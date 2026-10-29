const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const A = jiti('../lib/acquisition/core.ts')
const G = jiti('../lib/guides/registry.ts')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const V = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

test('ref tags: allow-list only; footer link is the site root with ?ref', () => {
  for (const r of ['approvals', 'changelog', 'portal', 'proposals', 'invoices', 'booking']) assert.equal(A.cleanRef(r), r)
  for (const r of ['x', 'Approvals', '', null, 'a@b.c']) assert.equal(A.cleanRef(r), null)
  assert.equal(A.madeWithHref('invoices'), 'https://saasnation.site/?ref=invoices')
  const t = A.parseTrack({ vid: V(1), path: '/', ref: 'portal', kind: 'cta' }, undefined)
  assert.equal(t.ref, 'portal'); assert.equal(t.cta, true)
  assert.equal(A.parseTrack({ vid: V(1), path: '/', ref: 'evil' }, undefined).ref, null)
})

test('funnel by ref: first ref per visitor, CTA clicks, signups and paying', () => {
  const e = (v, kind, o = {}) => ({ visitor_id: V(v), kind, free_tool: null, utm_source: null, utm_medium: null, utm_campaign: null, user_id: null, ref: null, ...o })
  const f = A.buildFunnel([e(1, 'visit', { ref: 'invoices' }), e(1, 'cta', { ref: 'invoices' }), e(1, 'cta'), e(1, 'signup', { user_id: 'u1' }), e(2, 'visit', { ref: 'invoices' }), e(3, 'visit'), e(4, 'visit', { ref: 'approvals' }), e(4, 'cta', { ref: 'approvals' })], new Set(['u1']))
  const inv = f.byRef.find((r) => r.key === 'invoices'), ap = f.byRef.find((r) => r.key === 'approvals')
  assert.deepEqual(inv, { key: 'invoices', visitors: 2, ctaClicks: 2, ctaVisitors: 1, signups: 1, paying: 1 })
  assert.deepEqual(ap, { key: 'approvals', visitors: 1, ctaClicks: 1, ctaVisitors: 1, signups: 0, paying: 0 })
  assert.equal(f.byRef.length, 2); assert.equal(f.total.visitors, 4)
})

test('every client-facing page has the Made with footer with the right ref', () => {
  for (const [f, r] of [['app/a/[token]/page.tsx', 'approvals'], ['app/c/[token]/page.tsx', 'changelog'], ['app/p/[token]/page.tsx', 'portal'], ['app/u/[handle]/p/[id]/page.tsx', 'proposals'], ['app/i/[token]/page.tsx', 'invoices'], ['app/u/[handle]/book/page.tsx', 'booking'], ['app/u/[handle]/book/[type]/page.tsx', 'booking']])
    assert.match(read(f), new RegExp(`<MadeWith tool="${r}"`), f)
})

test('beacon: Do-Not-Track respected; never runs on client-facing pages; no PII', () => {
  const b = read('components/tracking/beacon.tsx')
  assert.match(b, /doNotTrack === '1'/g)
  assert.equal((b.match(/doNotTrack === '1'/g) || []).length, 2)
  const skip = new RegExp(b.match(/const SKIP = \/(.*)\/\n/)[1])
  for (const p of ['/a/x', '/c/x', '/p/x', '/i/x', '/u/h/p/1', '/u/h/book']) assert.ok(skip.test(p), p)
  for (const p of ['/', '/pricing', '/guides/client-onboarding-checklist', '/free-tools']) assert.ok(!skip.test(p), p)
  const r = read('app/api/track/route.ts'); assert.doesNotMatch(r, /email|ip:|clientIp\(req\)\s*,\s*\}/i)
  assert.match(read('app/privacy/page.tsx'), /Made with SaaS Nation/)
})

test('guides: static, indexable, canonical, in the sitemap; honest copy', () => {
  assert.equal(G.GUIDES.length, 3)
  const sm = read('app/sitemap.ts'); assert.match(sm, /GUIDES\.map/)
  for (const g of G.GUIDES) {
    const s = read(`app/guides/${g.slug}/page.tsx`)
    assert.match(s, /canonical: guidePath\(g\.slug\)/); assert.doesNotMatch(s, /index: false|noindex|force-dynamic/)
    assert.match(g.tool.href, /^\/pricing/); assert.match(g.freeTool.href, /^\/free-tools\//)
    assert.doesNotMatch(s, /\d+%|testimonial|trusted by|thousands of/i)
    assert.doesNotMatch(s.replace(/doesn’t send (emails|reminders)[^.]*\.|isn’t an e-signature tool/g, ''), /reminder|e-sign|we host/i)
  }
})
