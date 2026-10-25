// HQ internal summary: fails closed, refuses Cloudflare-routed requests, returns counts only.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const S = jiti('../lib/server/internal-summary.ts')
const TOK = 'x'.repeat(40)
const H = (o) => new Headers(o)

test('404 when INTERNAL_SUMMARY_TOKEN unset or short', () => {
  assert.equal(S.allowSummary(H({ 'x-internal-token': TOK }), {}), 404)
  assert.equal(S.allowSummary(H({ 'x-internal-token': 'short' }), { INTERNAL_SUMMARY_TOKEN: 'short' }), 404)
})
test('403 on wrong/missing token or Cloudflare headers; 200 on exact token', () => {
  const env = { INTERNAL_SUMMARY_TOKEN: TOK }
  assert.equal(S.allowSummary(H({}), env), 403)
  assert.equal(S.allowSummary(H({ 'x-internal-token': TOK + 'y' }), env), 403)
  assert.equal(S.allowSummary(H({ 'x-internal-token': TOK, 'cf-connecting-ip': '1.2.3.4' }), env), 403)
  assert.equal(S.allowSummary(H({ 'x-internal-token': TOK, 'x-forwarded-for': '1.2.3.4' }), env), 403)
  assert.equal(S.allowSummary(H({ 'x-internal-token': TOK }), env), 200)
})
test('loadCounts returns numbers only and excludes demo users', async () => {
  const calls = []
  const q = (table) => { const st = { table, f: [] }; calls.push(st); const p = { select: () => p, not: (...a) => (st.f.push(['not', ...a]), p), eq: () => p, neq: () => p, gte: () => p, lt: () => p,
    then: (r) => r({ count: 3, error: null }) }; return p }
  const out = await S.loadCounts({ from: q }, new Set(['00000000-0000-4000-8000-000000000001']), Date.parse('2026-10-25T12:00:00Z'))
  assert.deepEqual(Object.values(out).every((v) => v === 3), true)
  assert.equal(Object.keys(out).length, 9)
  assert.ok(calls.every((c) => c.f.some((f) => f[0] === 'not')))
})
test('route lives under /healthz (middleware skipped) and never selects columns', () => {
  const src = fs.readFileSync(path.join(root, 'app/healthz/summary/route.ts'), 'utf8')
  assert.match(src, /allowSummary/)
  const lib = fs.readFileSync(path.join(root, 'lib/server/internal-summary.ts'), 'utf8')
  assert.match(lib, /head: true/)
  assert.deepEqual([...lib.matchAll(/\.select\(([^)]*)\)/g)].map((m) => m[1]), ["'id', { count: 'exact', head: true }"])
})
