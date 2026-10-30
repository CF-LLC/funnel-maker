const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const T = jiti('../lib/time/core.ts')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const E = (o) => ({ id: 'e', project_id: 'p1', entry_date: '2026-10-28', started_at: null, seconds: 3600, note: null, billable: true, invoice_id: null, invoiced_at: null, ...o })
const P = [{ id: 'p1', client_id: 'c1', name: 'Site', hourly_rate_cents: 12000, billable: true, archived: false }, { id: 'p2', client_id: 'c1', name: 'Coaching', hourly_rate_cents: null, billable: true, archived: false }]
const C = [{ id: 'c1', name: 'Riverside', email: null, crm_email: null, archived: false }]
const S = { default_rate_cents: 9000, currency: 'USD' }

test('durations parse in common formats and are bounded to 1 minute..24h', () => {
  assert.equal(T.parseDuration('1:30'), 5400); assert.equal(T.parseDuration('90m'), 5400); assert.equal(T.parseDuration('1.5h'), 5400)
  assert.equal(T.parseDuration('1.5'), 5400); assert.equal(T.parseDuration('1h 15m'), 4500); assert.equal(T.parseDuration('2 hours'), 7200)
  for (const bad of ['', 'abc', '0', '25', '24:01', '-1', null, '0:00']) assert.equal(T.parseDuration(bad), null, String(bad))
  assert.equal(T.fmtDuration(3725, true), '1:02:05'); assert.equal(T.fmtDuration(5400), '1:30')
})

test('rate falls back to the default; money = hours x rate on billable time only', () => {
  assert.equal(T.rateFor(P[0], S), 12000); assert.equal(T.rateFor(P[1], S), 9000); assert.equal(T.rateFor(P[1], null), 0)
  assert.equal(T.entryCents(E({ seconds: 5400 }), P[0], S), 18000)
  assert.equal(T.entryCents(E({ billable: false }), P[0], S), 0)
})

test('running timer counts from started_at, capped at 24h', () => {
  const now = Date.parse('2026-10-28T12:00:00Z')
  assert.equal(T.entrySeconds(E({ seconds: null, started_at: '2026-10-28T11:30:00Z' }), now), 1800)
  assert.equal(T.entrySeconds(E({ seconds: null, started_at: '2026-10-20T00:00:00Z' }), now), 86400)
})

test('totals per project and client; unbilled excludes billed and running', () => {
  const t = T.totals([E({ id: 'a' }), E({ id: 'b', project_id: 'p2', seconds: 1800 }), E({ id: 'c', invoice_id: 'i' })], P, C, S)
  assert.equal(t.seconds, 9000); assert.equal(t.cents, 12000 + 4500 + 12000); assert.equal(t.unbilledCents, 16500)
  assert.equal(t.clients.length, 1); assert.equal(t.clients[0].name, 'Riverside'); assert.equal(t.projects.length, 2)
})

test('week starts Monday', () => {
  assert.equal(T.weekStart('2026-10-29'), '2026-10-26'); assert.equal(T.weekStart('2026-11-01'), '2026-10-26'); assert.equal(T.weekStart('2026-10-26'), '2026-10-26')
})

test('invoice lines: per project or per entry, only unbilled billable stopped time', () => {
  const list = [E({ id: 'a', entry_date: '2026-10-27', seconds: 3600, note: 'Hero' }), E({ id: 'b', entry_date: '2026-10-28', seconds: 1800 }), E({ id: 'c', project_id: 'p2', seconds: 2700 }),
    E({ id: 'x', invoice_id: 'i' }), E({ id: 'y', billable: false }), E({ id: 'z', seconds: null, started_at: 'x' })]
  const ready = T.invoiceable(list)
  assert.deepEqual(ready.map((e) => e.id), ['a', 'b', 'c'])
  const byP = T.toInvoiceLines(ready, P, S, 'project')
  assert.equal(byP.length, 2)
  assert.deepEqual(byP[0], { position: 0, description: 'Site: 2 entries, 2026-10-27 to 2026-10-28', quantity: 1.5, unit_price_cents: 12000 })
  assert.equal(byP[1].unit_price_cents, 9000); assert.equal(byP[1].quantity, 0.75)
  const byE = T.toInvoiceLines(ready, P, S, 'entry')
  assert.equal(byE.length, 3); assert.equal(byE[0].description, 'Site · 2026-10-27 · Hero'); assert.equal(byE[0].quantity, 1)
  assert.ok(byE.every((l) => l.quantity > 0 && l.description.length <= 500))
})

test('CSV escapes cells and blocks formula injection', () => {
  const csv = T.toCsv([E({ note: '=HYPERLINK("x")' }), E({ id: 'r', seconds: null, started_at: 'x' })], P, C, S)
  const lines = csv.trim().split('\r\n')
  assert.equal(lines.length, 2)
  assert.equal(lines[0], T.CSV_HEADER.join(','))
  assert.match(lines[1], /"'=HYPERLINK\(""x""\)"/); assert.match(lines[1], /,unbilled$/); assert.match(lines[1], /120\.00 USD/)
})

test('migration: additive, tight RLS, one running timer, invoice delete returns time to unbilled, flag off', () => {
  const m = read('supabase/migrations/20261030a_time.sql')
  assert.doesNotMatch(m, /drop table|truncate|delete from/i)
  assert.match(m, /'approvals','time','all'/)
  assert.match(m, /tool in \('time', 'all'\)/)
  assert.match(m, /invoice_id uuid references public\.inv_invoices\(id\) on delete set null/)
  assert.match(m, /new\.invoiced_at := null/)
  assert.match(m, /create unique index if not exists tt_entries_one_running on public\.tt_entries \(user_id\) where seconds is null/)
  for (const t of ['tt_settings', 'tt_clients', 'tt_projects', 'tt_entries']) assert.match(m, new RegExp(`alter table public\\.${t} enable row level security`))
  assert.match(m, /revoke all on public\.tt_settings, public\.tt_clients, public\.tt_projects, public\.tt_entries from anon/)
  assert.match(m, /'timetracking_public', false/)
})

test('routes: guarded, demo blocks writes, nothing sends email', () => {
  const g = read('lib/time/guard.ts')
  assert.match(g, /hasAccess\(user, 'time'\)/); assert.match(g, /write && demo/)
  const dirs = ['lib/time', 'app/api/time', 'app/time', 'components/time']
  const files = dirs.flatMap((d) => fs.readdirSync(path.join(root, d), { recursive: true }).filter((f) => /\.tsx?$/.test(f)).map((f) => path.join(d, f)))
  for (const f of files) assert.doesNotMatch(read(f), /resend|sendEmail|nodemailer|service_role|SERVICE_ROLE/i, f)
  for (const f of files.filter((f) => f.startsWith('app/api/time') && f !== path.join('app/api/time', 'route.ts') && !f.includes('export'))) assert.match(read(f), /ttGuard\(true\)/, f)
  const inv = read('app/api/time/invoice/route.ts')
  assert.match(inv, /inv_invoice_lines/); assert.match(inv, /42501/); assert.doesNotMatch(inv, /status: 'paid'/)
})

test('registry: tool id time, route /time, launch flag timetracking (runtime timetracking_public), pricing maps the flag', () => {
  const R = jiti('../tools/registry.ts')
  const t = R.getTool('time')
  assert.equal(t.route, '/time'); assert.equal(t.accessKey, 'time'); assert.equal(t.launchFlag, 'timetracking')
  assert.equal(R.LAUNCH_FLAGS.timetracking, false)
  assert.ok(!R.publicTools().some((x) => x.id === 'time')); assert.ok(R.publicTools({ ...R.LAUNCH_FLAGS, timetracking: true }).some((x) => x.id === 'time'))
  assert.ok(R.isProtectedPath('/time'))
  assert.match(read('components/pricing-plans.tsx'), /FLAG_OF: Partial<Record<string, string>> = \{ time: 'timetracking' \}/)
  assert.match(read('lib/plans.ts'), /time: \{ monthly: process\.env\.NEXT_PUBLIC_STRIPE_LINK_TIME_MONTHLY, yearly: process\.env\.NEXT_PUBLIC_STRIPE_LINK_TIME_YEARLY \}/)
})
