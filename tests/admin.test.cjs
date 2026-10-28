// Admin dashboard: gating (non-admin 404, signed-out redirect), aggregation helpers, feature flags.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@/lib/supabase': path.join(__dirname, 'stubs/supabase-stub.cjs'), '@': root } })
const G = jiti('../lib/admin/guard.ts')
const C = jiti('../lib/admin/core.ts')
const reg = jiti('../tools/registry.ts')

const ADMIN = '11111111-1111-1111-1111-111111111111'
const USER = '22222222-2222-2222-2222-222222222222'
const as = (id) => { globalThis.__sb = { user: id ? { id } : null, admins: [ADMIN] } }

test('api guard: signed out and non-admin get 404; admin passes', async () => {
  as(null); let g = await G.adminApiGuard(); assert.equal(g.res.status, 404)
  as(USER); g = await G.adminApiGuard(); assert.equal(g.res.status, 404)
  assert.equal(g.res.headers.get('cache-control'), 'no-store')
  as(ADMIN); g = await G.adminApiGuard(); assert.equal(g.adminId, ADMIN); assert.equal(g.res, undefined)
})

test('page guard: signed out redirects to login, non-admin is notFound, admin passes', async () => {
  as(null); await assert.rejects(G.requireAdminPage('/admin/users'), (e) => /NEXT_REDIRECT/.test(e.digest || e.message) && /auth\/login\?redirectTo=%2Fadmin%2Fusers/.test(e.digest || ''))
  as(USER); await assert.rejects(G.requireAdminPage(), (e) => /NEXT_(HTTP_ERROR_FALLBACK;404|NOT_FOUND)/.test(e.digest || e.message))
  as(ADMIN); assert.equal(await G.requireAdminPage(), ADMIN)
})

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))
test('every /api/admin route handler and every /admin page is guarded server-side', () => {
  for (const f of walk(path.join(root, 'app/api/admin')).filter((f) => f.endsWith('route.ts'))) {
    const s = fs.readFileSync(f, 'utf8')
    const handlers = s.match(/export async function (GET|POST|PUT|PATCH|DELETE)/g) || []
    assert.ok(handlers.length > 0, f)
    assert.equal((s.match(/await adminApiGuard\(\)/g) || []).length, handlers.length, `${f}: each handler calls adminApiGuard`)
    assert.doesNotMatch(s, /currentAdminId|status: 403/, f)
  }
  const pages = walk(path.join(root, 'app/admin')).filter((f) => /(page|layout)\.tsx$/.test(f))
  assert.ok(pages.length >= 6)
  for (const f of pages) assert.match(fs.readFileSync(f, 'utf8'), /await requireAdminPage\(/, f)
  assert.match(fs.readFileSync(path.join(root, 'app/admin/layout.tsx'), 'utf8'), /robots: \{ index: false/)
  const cfg = fs.readFileSync(path.join(root, 'next.config.mjs'), 'utf8')
  for (const src of ["'/admin'", "'/admin/:path*'", "'/api/admin/:path*'"]) assert.ok(cfg.includes(`source: ${src}`), src)
  assert.match(cfg, /noindex/); assert.match(cfg, /no-store/)
  // service role never in client components
  for (const f of walk(path.join(root, 'components/admin'))) {
    const s = fs.readFileSync(f, 'utf8')
    if (s.startsWith("'use client'")) assert.doesNotMatch(s, /serviceClient|SUPABASE_SECRET_KEY|lib\/admin\/load/, f)
  }
})

test('helpers: series, counts, demo exclusion, status, masking, pagination', () => {
  const now = new Date('2026-10-27T18:00:00Z')
  const d = ['2026-10-27T01:00:00Z', '2026-10-27T05:00:00Z', '2026-10-25T10:00:00Z', '2026-09-01T00:00:00Z', null, 'bad']
  assert.deepEqual(C.dailySeries(d, 3, now), [1, 0, 2])
  assert.equal(C.countSince(d, 7, now), 3)
  assert.equal(C.countSince(d, 60, now), 4)
  const rows = [{ id: 'A' }, { id: 'b' }]
  assert.deepEqual(C.excludeDemo(rows, new Set(['a']), (r) => r.id), [{ id: 'b' }])
  assert.equal(C.excludeDemo(rows, new Set(['a']), (r) => r.id, true).length, 2)
  assert.equal(C.userStatus({ bannedUntil: '2126-01-01T00:00:00Z', approved: true, demo: false }, now), 'suspended')
  assert.equal(C.userStatus({ bannedUntil: '2020-01-01T00:00:00Z', approved: true, demo: false }, now), 'active')
  assert.equal(C.userStatus({ bannedUntil: null, approved: false, demo: false }, now), 'pending')
  assert.equal(C.userStatus({ bannedUntil: null, approved: true, demo: true }, now), 'demo')
  assert.equal(C.maskEmail('maya.lopez@example.com'), 'm•••@e•••.com')
  assert.ok(!C.maskEmail('cooper@gmail.com').includes('cooper'))
  const p = C.paginate([1, 2, 3, 4, 5], 9, 2)
  assert.deepEqual([p.items, p.page, p.pages, p.total], [[5], 3, 3, 5])
  assert.equal(C.searchRows([{ e: 'Maya@x.com' }, { e: 'sam@y.org' }], 'maya', (r) => [r.e]).length, 1)
  assert.equal(C.SUSPEND_DURATION, '876000h')
})

test('seats and MRR estimate: paid sources only, yearly normalized, inactive ignored', () => {
  const r = (tool, source, plan = null, active = true, sub = 'sub_x') => ({ user_id: 'u', tool, source, plan, active, stripe_subscription_id: sub })
  const rows = [r('funnels', 'single'), r('funnels', 'single', null, true, null), r('proposals', 'all_access', null, true, ''), r('all', 'all_access', 'yearly'), r('invoices', 'founding'), r('crm', 'manual'), r('forms', 'single', null, false), r('booking', 'single', 'Yearly')]
  assert.equal(C.mrrEstimateCents(rows), 1200 + Math.round(24900 / 12) + Math.round(9900 / 12))
  const seats = C.seatsByPlan(rows)
  assert.deepEqual(seats.find((s) => s.tool === 'invoices'), { tool: 'invoices', paid: 0, comped: 1 })
  assert.deepEqual(seats.find((s) => s.tool === 'funnels'), { tool: 'funnels', paid: 1, comped: 1 })
  assert.deepEqual(seats.find((s) => s.tool === 'proposals'), { tool: 'proposals', paid: 0, comped: 1 })
  assert.equal(C.isPaidSeat(r('funnels', 'single', null, true, null)), false)
  assert.equal(seats.find((s) => s.tool === 'forms'), undefined)
  assert.equal(C.monthlyCents(9900, 'year'), 825)
  assert.equal(C.monthlyCents(1200, 'month', 1, 2), 2400)
  assert.equal(C.monthlyCents(3600, 'month', 3), 1200)
})

test('feature flags: crm_public defaults off, runtime flag reveals CRM, keys validated', () => {
  assert.equal(C.crmPublic(false, false), false)
  assert.equal(C.crmPublic(false, null), false)
  assert.equal(C.crmPublic(false, true), true)
  assert.equal(C.crmPublic(true, false), true)
  assert.ok(!reg.publicTools({ crm: false }).some((t) => t.id === 'crm'))
  assert.ok(reg.publicTools({ crm: true }).some((t) => t.id === 'crm'))
  assert.ok(reg.toolsInRow('all', { crm: true }).some((t) => t.id === 'crm'))
  assert.ok(!reg.toolsInRow('all', { crm: false }).some((t) => t.id === 'crm'))
  assert.ok(C.FLAG_KEY_RE.test('crm_public')); assert.ok(!C.FLAG_KEY_RE.test("x'; drop"))
  const sql = fs.readFileSync(path.join(root, 'supabase/migrations/20261027a_admin.sql'), 'utf8')
  assert.match(sql, /values \('crm_public', false/)
  assert.doesNotMatch(sql, /\bdrop table\b|\bdelete from\b|\btruncate\b/i)
  for (const t of ['app_errors', 'admin_audit', 'feature_flags']) assert.match(sql, new RegExp(`alter table public\\.${t} enable row level security`))
  assert.match(sql, /revoke all on public\.app_errors, public\.admin_audit, public\.feature_flags from anon, authenticated/)
  assert.doesNotMatch(sql, /create policy/)
  // public pages honor the runtime flag
  for (const f of ['app/page.tsx', 'app/pricing/page.tsx', 'components/tools/your-tools.tsx', 'app/dashboard/page.tsx']) assert.match(fs.readFileSync(path.join(root, f), 'utf8'), /getLaunchFlags\(\)/, f)
  assert.match(fs.readFileSync(path.join(root, 'app/dashboard/layout.tsx'), 'utf8'), /fm_public_flag/)
})
