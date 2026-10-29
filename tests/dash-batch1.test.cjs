const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')
const V1 = '11111111-1111-4111-8111-111111111111', V2 = '22222222-2222-4222-8222-222222222222', V3 = '33333333-3333-4333-8333-333333333333'

test('acquisition: path + beacon parsing', () => {
  const a = jiti('../lib/acquisition/core.ts')
  assert.equal(a.freeToolFromPath('/free-tools/qr-code-generator'), 'qr-code-generator')
  assert.equal(a.freeToolFromPath('/free-tools/nope'), null)
  assert.equal(a.freeToolFromPath('/pricing'), null)
  assert.equal(a.parseTrack({ vid: 'x', path: '/' }, undefined), null)
  assert.equal(a.parseTrack({ vid: V1, path: 'http://evil' }, undefined), null)
  const t = a.parseTrack({ vid: V2, path: '/?a=1', utm_source: ' NewsLetter<script>', utm_medium: 'email' }, V1)
  assert.equal(t.visitorId, V1)
  assert.equal(t.path, '/')
  assert.equal(t.utm_source, 'newsletterscript')
})

test('acquisition: funnel math by source and free tool', () => {
  const { buildFunnel } = jiti('../lib/acquisition/core.ts')
  const e = (v, kind, x = {}) => ({ visitor_id: v, kind, free_tool: null, utm_source: null, utm_medium: null, utm_campaign: null, user_id: null, ...x })
  const f = buildFunnel([
    e(V1, 'visit', { utm_source: 'x', utm_medium: 'social' }), e(V1, 'free_tool', { free_tool: 'utm-builder' }), e(V1, 'signup', { user_id: 'u1' }),
    e(V2, 'free_tool', { free_tool: 'utm-builder' }), e(V2, 'signup', { user_id: 'u2' }),
    e(V3, 'visit'),
  ], new Set(['u1']))
  assert.deepEqual(f.total, { key: 'All visitors', visitors: 3, freeToolUsers: 2, signups: 2, paying: 1 })
  assert.deepEqual(f.bySource.find((r) => r.key === 'x / social'), { key: 'x / social', visitors: 1, freeToolUsers: 1, signups: 1, paying: 1 })
  assert.equal(f.bySource.find((r) => r.key === 'direct / none').visitors, 2)
  assert.deepEqual(f.byTool, [{ key: 'utm-builder', visitors: 2, freeToolUsers: 2, signups: 2, paying: 1 }])
})

test('acquisition table is additive and locked to the service role', () => {
  const m = read('supabase/migrations/20261028d_acquisition_events.sql')
  assert.match(m, /create table if not exists public\.acquisition_events/)
  assert.match(m, /enable row level security/)
  assert.match(m, /force row level security/)
  assert.match(m, /revoke all on public\.acquisition_events from public, anon, authenticated/)
  assert.doesNotMatch(m, /\b(drop|truncate|delete from)\b/i)
  assert.doesNotMatch(m, /\b(email|ip_address) text/i)
})

test('unsubscribe page: tokenized, signed-out, link helper', () => {
  const { unsubscribeUrl } = jiti('../lib/updates/signup.ts')
  assert.equal(unsubscribeUrl('https://saasnation.app/', V1), `https://saasnation.app/updates/unsubscribe?token=${V1}`)
  const p = read('app/updates/unsubscribe/page.tsx')
  assert.match(p, /isUuid\(token\)/)
  assert.match(p, /index: false/)
  assert.doesNotMatch(p, /requireAdminPage|getUser/)
  assert.match(read('components/updates/unsubscribe-form.tsx'), /\/api\/updates\/unsubscribe/)
})

test('admin revenue: read-only Stripe, explicit estimate state without a key', () => {
  const l = read('lib/admin/load.ts')
  const fn = l.slice(l.indexOf('export async function loadRevenue'), l.indexOf('export async function loadFunnel'))
  assert.match(fn, /if \(!process\.env\.STRIPE_SECRET_KEY\) return \{ source: 'estimate'/)
  assert.match(fn, /Estimate only/)
  assert.doesNotMatch(fn, /\.(create|update|del|cancel|pay)\(/)
  assert.match(read('components/admin/views.tsx'), /Estimate only/)
})

test('dashboard: checklist + locked upsell tiles go to /pricing only', () => {
  const d = read('app/dashboard/page.tsx')
  assert.match(d, /<OnboardingChecklist steps=\{steps\}/)
  assert.match(d, /<UpsellTiles tools=\{locked\}/)
  const u = read('components/dashboard/upsell-tiles.tsx')
  assert.match(u, /href="\/pricing"/)
  assert.doesNotMatch(u, /stripe|checkout/i)
})
