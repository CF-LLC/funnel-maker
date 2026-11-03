// PR 5 (SaaS Nation rework): "Get set up" checklist + client next-step buttons behind workspace_v2.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@/lib/supabase': path.join(__dirname, 'stubs/supabase-stub.cjs'), '@': root } })
const C = jiti('../lib/me/setup-core.ts')
const L = jiti('../lib/me/setup.ts')
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')
const U1 = '11111111-1111-1111-1111-111111111111'
const U2 = '22222222-2222-2222-2222-222222222222'
const ALL = new Set(C.SETUP_TOOLS)

// Fake PostgREST: eq/is/not filters, returns ONLY selected columns, supports count head.
function fakeDb(tables, opts = {}) {
  const calls = []
  return { calls, from(t) {
    const q = { t, f: [], cols: null, head: false, writes: false }
    calls.push(q)
    const api = {
      select(cols, o) { q.cols = cols; q.head = !!o?.head; return api },
      eq(c, v) { q.f.push((r) => r[c] === v); return api },
      is(c, v) { q.f.push((r) => (r[c] ?? null) === v); return api }, not(c, op, v) { q.f.push((r) => (r[c] ?? null) !== v); return api },
      limit() { return api },
      insert() { q.writes = true; return api }, update() { q.writes = true; return api }, delete() { q.writes = true; return api },
      then(res, rej) {
        if (opts.fail === t) return Promise.resolve({ data: null, count: null, error: { message: 'boom' } }).then(res, rej)
        const rows = (tables[t] || []).filter((r) => q.f.every((fn) => fn(r)))
        const cols = q.cols.split(',').map((s) => s.trim())
        const pick = (r) => Object.fromEntries(cols.filter((c) => c in r).map((c) => [c, r[c]]))
        return Promise.resolve({ data: q.head ? null : rows.map(pick), count: rows.length, error: null }).then(res, rej)
      },
    }
    return api
  } }
}

test('loader: nothing done for an empty account; other users\' rows never count', async () => {
  const db = fakeDb({ crm_contacts: [{ user_id: U2, email: 'x@y.z' }], inv_invoices: [{ id: 'i', user_id: U2, status: 'paid' }], funnels: [{ id: 'f', user_id: U2, is_public: true }] })
  assert.deepEqual(await L.loadSetup(db, U1, ALL), { client: false, sent: false, shared: false, paid: false })
  assert.ok(db.calls.every((q) => !q.writes && q.head), 'read-only head counts')
})

test('loader: partial progress from real rows (unpublished/inactive/no-email rows do not count)', async () => {
  const db = fakeDb({
    inv_clients: [{ id: 'c', user_id: U1, email: null }],
    crm_contacts: [{ user_id: U1, email: 'a@b.co' }],
    prp_proposals: [{ id: 'p', user_id: U1 }],
    funnels: [{ id: 'f', user_id: U1, is_public: false }],
    frm_forms: [{ id: 'fm', user_id: U1, published: false }],
    bk_types: [{ id: 'b', user_id: U1, active: false }],
    inv_invoices: [{ id: 'i', user_id: U1, status: 'unpaid' }],
    inv_profiles: [{ user_id: U1, pay_link: null }],
  })
  assert.deepEqual(await L.loadSetup(db, U1, ALL), { client: true, sent: true, shared: false, paid: false })
})

test('loader: share and paid steps from published form / active booking type / pay link / paid invoice', async () => {
  assert.equal((await L.loadSetup(fakeDb({ frm_forms: [{ id: 'x', user_id: U1, published: true }] }), U1, ALL)).shared, true)
  assert.equal((await L.loadSetup(fakeDb({ bk_types: [{ id: 'x', user_id: U1, active: true }] }), U1, ALL)).shared, true)
  assert.equal((await L.loadSetup(fakeDb({ funnels: [{ id: 'x', user_id: U1, is_public: true }] }), U1, ALL)).shared, true)
  assert.equal((await L.loadSetup(fakeDb({ inv_profiles: [{ user_id: U1, pay_link: 'https://buy.stripe.com/x' }] }), U1, ALL)).paid, true)
  assert.equal((await L.loadSetup(fakeDb({ inv_invoices: [{ id: 'i', user_id: U1, status: 'paid' }] }), U1, ALL)).paid, true)
})

test('loader: only queries tools the user has; a failing query leaves just that step undone', async () => {
  const db = fakeDb({ crm_contacts: [{ user_id: U1, email: 'a@b.co' }], frm_forms: [{ id: 'x', user_id: U1, published: true }] }, { fail: 'frm_forms' })
  const f = await L.loadSetup(db, U1, new Set(['crm', 'forms']))
  assert.deepEqual(f, { client: true, sent: false, shared: false, paid: false })
  assert.deepEqual([...new Set(db.calls.map((q) => q.t))].sort(), ['crm_contacts', 'frm_forms'])
})

test('builder: owned tools link to the tool, locked ones to /pricing with plain wording', () => {
  const s = C.buildSetup({ client: true }, new Set(['crm', 'invoices']))
  assert.deepEqual(s.map((x) => x.id), ['client', 'send', 'share', 'paid'])
  assert.deepEqual(s.map((x) => x.href), ['/crm', '/invoices', '/pricing', '/invoices'])
  assert.equal(s[0].done, true); assert.equal(s[2].locked, true)
  assert.match(s[2].hint, /\$12\/mo/)
  const n = C.buildSetup({}, new Set())
  assert.ok(n.every((x) => x.locked && x.href === '/pricing'))
  assert.equal(C.buildSetup({}, new Set(['proposals', 'invoices'])).find((x) => x.id === 'send').href, '/proposals')
  assert.equal(C.buildSetup({}, new Set(['funnels', 'booking'])).find((x) => x.id === 'share').href, '/booking')
  for (const x of [...s, ...n]) assert.ok(!/\$\d/.test(x.hint) || /\$12\/mo/.test(x.hint), 'no invented prices')
})

test('builder: complete when all 4 done (card hidden)', () => {
  assert.equal(C.setupComplete(C.buildSetup({ client: true, sent: true, shared: true, paid: true }, ALL)), true)
  assert.equal(C.setupComplete(C.buildSetup({ client: true, sent: true, shared: true }, ALL)), false)
})

test('wiring: dashboard + client page gated by workspace_v2; flag off = unchanged', () => {
  const d = read('app/dashboard/page.tsx')
  assert.match(d, /isUserFlagEnabled\('workspace_v2'/)
  assert.match(d, /\{setup && <SetupChecklist steps=\{setup\} \/>\}/)
  assert.match(d, /\{!setup && <OnboardingChecklist steps=\{steps\} \/>\}/)
  const c = read('app/crm/[contactId]/page.tsx')
  const flag = c.indexOf("isUserFlagEnabled('workspace_v2'"); const ns = c.indexOf('nextSteps = [')
  assert.ok(flag > 0 && ns > flag, 'next steps built only inside the flag branch')
  assert.match(c, /'\/invoices\/new'/); assert.match(c, /'\/proposals\/new'/)
  assert.match(read('components/crm/contact-detail.tsx'), /nextSteps && nextSteps.length > 0/)
  assert.ok(!/insert|update\(|delete\(|upsert/.test(read('lib/me/setup.ts')), 'loader has no writes')
})
