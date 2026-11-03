// PR 3 (SaaS Nation rework): Today panel on /dashboard behind workspace_v2. Real counts, own rows, access-gated.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@/lib/supabase': path.join(__dirname, 'stubs/supabase-stub.cjs'), '@': root } })
const C = jiti('../lib/me/today-core.ts')
const L = jiti('../lib/me/today.ts')
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')
const U1 = '11111111-1111-1111-1111-111111111111'
const U2 = '22222222-2222-2222-2222-222222222222'
const ALL = new Set(C.TODAY_TOOLS)

// Fake PostgREST: filters eq/lt/gte/in/is/not, returns ONLY selected columns, supports count head + one nested relation.
function fakeDb(tables, opts = {}) {
  const calls = []
  const db = { calls, from(t) {
    const q = { t, f: [], cols: null, head: false, count: false, writes: false }
    calls.push(q)
    const api = {
      select(cols, o) { q.cols = cols; q.head = !!o?.head; q.count = !!o?.count; return api },
      eq(c, v) { q.f.push((r) => r[c] === v); return api }, lt(c, v) { q.f.push((r) => r[c] < v); return api },
      gte(c, v) { q.f.push((r) => r[c] >= v); return api }, in(c, v) { q.f.push((r) => v.includes(r[c])); return api },
      is(c, v) { q.f.push((r) => (r[c] ?? null) === v); return api }, not(c, op, v) { q.f.push((r) => (r[c] ?? null) !== v); return api },
      limit() { return api }, order() { return api },
      insert() { q.writes = true; return api }, update() { q.writes = true; return api }, delete() { q.writes = true; return api },
      then(res, rej) {
        if (opts.fail === t) return Promise.resolve({ data: null, count: null, error: { message: 'boom' } }).then(res, rej)
        const rows = (tables[t] || []).filter((r) => q.f.every((fn) => fn(r)))
        const pick = (r) => { const o = {}; const m = q.cols.match(/(\w+)\(([^)]*)\)/); const flat = q.cols.replace(/\w+\([^)]*\)/, '').split(',').map((s) => s.trim()).filter(Boolean)
          for (const c of flat) if (c in r) o[c] = r[c]
          if (m) o[m[1]] = (tables[m[1]] || []).filter((x) => x.invoice_id === r.id).map((x) => { const y = {}; for (const c of m[2].split(',').map((s) => s.trim())) y[c] = x[c]; return y })
          return o }
        return Promise.resolve({ data: q.head ? null : rows.map(pick), count: q.head || q.count ? rows.length : null, error: null }).then(res, rej)
      },
    }
    return api
  } }
  return db
}

const NOW = new Date('2026-11-02T18:00:00Z')
const seed = () => ({
  inv_invoices: [
    { id: 'i1', user_id: U1, status: 'unpaid', due_date: '2026-10-20', currency: 'USD', tax_rate: null, client_name: 'SECRET' },
    { id: 'i2', user_id: U1, status: 'unpaid', due_date: '2026-12-20', currency: 'USD', tax_rate: null },
    { id: 'i3', user_id: U1, status: 'paid', due_date: '2026-10-01', currency: 'USD', tax_rate: null },
    { id: 'i4', user_id: U2, status: 'unpaid', due_date: '2026-10-01', currency: 'USD', tax_rate: null },
  ],
  inv_invoice_lines: [{ invoice_id: 'i1', quantity: 2, unit_price_cents: 25000 }, { invoice_id: 'i4', quantity: 1, unit_price_cents: 999 }],
  prp_proposals: [{ id: 'p1', user_id: U1, status: 'sent', expires_on: null }, { id: 'p2', user_id: U1, status: 'sent', expires_on: '2026-10-01' }, { id: 'p3', user_id: U1, status: 'draft' }, { id: 'p4', user_id: U2, status: 'sent' }],
  bk_bookings: [{ id: 'b1', user_id: U1, status: 'confirmed', starts_at: '2026-11-03T15:00:00.000Z' }, { id: 'b2', user_id: U1, status: 'confirmed', starts_at: '2026-11-10T15:00:00.000Z' }, { id: 'b3', user_id: U1, status: 'cancelled', starts_at: '2026-11-03T16:00:00.000Z' }],
  ap_items: [{ id: 'a1', user_id: U1, revoked: false }, { id: 'a2', user_id: U1, revoked: false }, { id: 'a3', user_id: U1, revoked: true }],
  ap_versions: [{ item_id: 'a1', user_id: U1, number: 1, status: 'changes' }, { item_id: 'a1', user_id: U1, number: 2, status: 'waiting' }, { item_id: 'a2', user_id: U1, number: 1, status: 'changes' }, { item_id: 'a3', user_id: U1, number: 1, status: 'changes' }],
  cl_requests: [{ id: 'r1', user_id: U1, status: 'approved', invoice_id: null }, { id: 'r2', user_id: U1, status: 'approved', invoice_id: 'i1' }, { id: 'r3', user_id: U1, status: 'pending', invoice_id: null }],
  funnels: [{ id: 'f1', user_id: U1 }, { id: 'f9', user_id: U2 }],
  fm_leads: [{ id: 'l1', funnel_id: 'f1', created_at: '2026-11-01T00:00:00.000Z' }, { id: 'l2', funnel_id: 'f1', created_at: '2026-10-01T00:00:00.000Z' }, { id: 'l3', funnel_id: 'f9', created_at: '2026-11-01T00:00:00.000Z' }],
  frm_responses: [],
  tt_entries: [{ id: 't1', user_id: U1, billable: true, invoice_id: null, seconds: 5400 }, { id: 't2', user_id: U1, billable: true, invoice_id: null, seconds: null }, { id: 't3', user_id: U1, billable: false, invoice_id: null, seconds: 99 }],
  ex_expenses: [{ id: 'e1', user_id: U1, billable: true, invoice_id: null, amount_cents: 4250 }, { id: 'e2', user_id: U1, billable: true, invoice_id: 'i1', amount_cents: 1 }],
})

test('loader: real counts from own rows only (user_id filter), overdue total from lines', async () => {
  const db = fakeDb(seed())
  const c = await L.loadToday(db, U1, ALL, NOW)
  assert.deepEqual(c.overdue, { count: 1, byCurrency: { USD: 50000 } })
  assert.equal(c.proposalsSent, 1)
  assert.equal(c.bookingsSoon, 1)
  assert.equal(c.approvalChanges, 1)
  assert.equal(c.changesReady, 1)
  assert.equal(c.leads7d, 1)
  assert.equal(c.responses7d, 0)
  assert.equal(c.unbilledTimeEntries, 1); assert.equal(c.unbilledSeconds, 5400)
  assert.deepEqual(c.unbilledExpenses, { count: 1, cents: 4250 })
  assert.ok(db.calls.every((q) => !q.writes), 'read-only')
  assert.ok(!db.calls.some((q) => /client_name|client_email|email/.test(q.cols || '')), 'no PII columns selected')
})

test('loader: only queries tools the user has; one failing tool hides only that row', async () => {
  const db = fakeDb(seed(), { fail: 'prp_proposals' })
  const c = await L.loadToday(db, U1, new Set(['invoices', 'proposals']), NOW)
  assert.deepEqual([...new Set(db.calls.map((q) => q.t))].sort(), ['inv_invoices', 'prp_proposals'])
  assert.equal(c.proposalsSent, undefined)
  assert.equal(c.overdue.count, 1)
})

test('builder: plain wording, links, hidden when tool missing or zero', async () => {
  const c = await L.loadToday(fakeDb(seed()), U1, ALL, NOW)
  const items = C.buildToday(c, ALL)
  assert.deepEqual(items.map((i) => i.id), ['overdue', 'proposals', 'bookings', 'approvals', 'leads', 'time', 'expenses', 'changes'])
  const by = Object.fromEntries(items.map((i) => [i.id, i]))
  assert.equal(by.overdue.text, '1 invoice overdue, $500.00 unpaid'); assert.equal(by.overdue.href, '/invoices')
  assert.equal(by.proposals.text, '1 proposal sent and waiting for a reply')
  assert.equal(by.bookings.text, '1 booking in the next 2 days')
  assert.equal(by.time.text, '1.5 h of billable time not invoiced yet')
  assert.equal(by.expenses.text, '1 billable expense not invoiced yet ($42.50)')
  assert.ok(!items.some((i) => i.id === 'responses'), 'zero hidden')
  assert.deepEqual(C.buildToday(c, new Set(['proposals'])).map((i) => i.id), ['proposals'])
  assert.deepEqual(C.buildToday({}, ALL), [])
  assert.equal(C.buildToday({ proposalsSent: 2 }, ALL)[0].text, '2 proposals sent and waiting for a reply')
  assert.equal(C.TODAY_EMPTY.href, '/crm')
})

test('dashboard: Today only behind workspace_v2 per-user flag; flag off = unchanged', () => {
  const s = read('app/dashboard/page.tsx')
  assert.match(s, /isUserFlagEnabled\('workspace_v2', user!\.id\)/)
  assert.match(s, /\{today && <TodayPanel items=\{today\} \/>\}/)
  assert.match(s, /let today: TodayItem\[\] \| null = null/)
  const p = read('components/dashboard/today-panel.tsx')
  assert.match(p, /TODAY_EMPTY\.cta/)
  assert.doesNotMatch(read('lib/me/today.ts'), /service_role|SERVICE_ROLE|\.insert\(|\.update\(|\.delete\(/)
})
