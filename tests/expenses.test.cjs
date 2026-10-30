const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const X = jiti('../lib/expenses/core.ts')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const E = (o) => ({ id: 'e', expense_date: '2026-10-28', amount_cents: 1000, vendor: 'Figma', category_id: 'c1', crm_email: null, tt_project_id: null, billable: false, note: null, receipt_name: null, receipt_mime: null, receipt_bytes: null, invoice_id: null, invoiced_at: null, ...o })
const CATS = [{ id: 'c1', name: 'Software', archived: false }, { id: 'c2', name: 'Travel', archived: false }]
const PROJ = [{ id: 'p1', name: 'Site', client_id: 'k1', client_name: 'Riverside', client_email: 'r@x.co', client_crm_email: null }]
const CRM = [{ email: 'sam@n.co', name: 'Sam', company: 'Northside' }]

test('amounts parse to cents and reject junk, zero, negatives and >2 decimals', () => {
  assert.equal(X.parseAmount('12'), 1200); assert.equal(X.parseAmount('$1,234.56'), 123456); assert.equal(X.parseAmount('0.5'), 50); assert.equal(X.parseAmount(19.99), 1999)
  for (const b of ['', 'abc', '0', '-5', '1.234', null, '1e3', 0]) assert.equal(X.parseAmount(b), null, String(b))
})
test('month and category totals; unbilled = billable and not on an invoice', () => {
  const list = [E({ id: 'a', amount_cents: 1000 }), E({ id: 'b', amount_cents: 2500, category_id: 'c2', billable: true }), E({ id: 'c', amount_cents: 700, billable: true, invoice_id: 'i' }), E({ id: 'd', amount_cents: 99, category_id: null }), E({ id: 'z', expense_date: '2026-09-30', amount_cents: 5000 })]
  const t = X.monthTotals(list, '2026-10', CATS)
  assert.equal(t.cents, 4299); assert.equal(t.billable, 3200); assert.equal(t.unbilled, 2500); assert.equal(t.count, 4)
  assert.deepEqual(t.categories.map((c) => [c.name, c.cents]), [['Travel', 2500], ['Software', 1700], ['Uncategorized', 99]])
  assert.deepEqual(X.monthSeries(list, '2026-10', 2).map((s) => s.cents), [5000, 4299])
  assert.equal(X.addMonths('2026-01', -1), '2025-12'); assert.equal(X.monthEnd('2026-02'), '2026-02-28')
})
test('bill-to: Time project client first, then CRM contact; groups only unbilled billable', () => {
  assert.equal(X.billTo(E({ tt_project_id: 'p1', crm_email: 'sam@n.co' }), PROJ, CRM).name, 'Riverside')
  assert.equal(X.billTo(E({ crm_email: 'sam@n.co' }), PROJ, CRM).name, 'Northside')
  assert.equal(X.billTo(E({}), PROJ, CRM), null)
  const g = X.unbilledGroups([E({ id: 'a', billable: true, tt_project_id: 'p1' }), E({ id: 'b', billable: true }), E({ id: 'c', billable: true, invoice_id: 'i', tt_project_id: 'p1' }), E({ id: 'd' })], PROJ, CRM)
  assert.deepEqual(g.map((x) => [x.to && x.to.name, x.items.map((e) => e.id)]), [['Riverside', ['a']], [null, ['b']]])
})
test('invoice lines: one per expense, quantity 1, amount as unit price, capped description', () => {
  const l = X.toInvoiceLines([E({ id: 'b', expense_date: '2026-10-29', amount_cents: 4520, note: 'Lunch' }), E({ id: 'a', expense_date: '2026-10-01', vendor: 'x'.repeat(600) })], CATS)
  assert.equal(l.length, 2); assert.equal(l[1].description, 'Expense: Figma · Software · 2026-10-29 (Lunch)'); assert.equal(l[1].unit_price_cents, 4520); assert.equal(l[1].quantity, 1)
  assert.equal(l[0].position, 0); assert.ok(l[0].description.length <= 500)
})
test('CSV escapes cells and blocks formula injection', () => {
  const csv = X.toCsv([E({ vendor: '=HYPERLINK("x")', note: 'a,b', billable: true })], CATS, PROJ, CRM)
  assert.match(csv.split('\r\n')[0], /^Date,Vendor,Category,Amount/); assert.match(csv, /"'=HYPERLINK\(""x""\)"/); assert.match(csv, /"a,b"/); assert.match(csv, /10\.00,yes/)
})
test('parseExpense validates and PATCH only touches given fields', () => {
  assert.deepEqual(X.parseExpense({ expense_date: '2026-10-30', amount: '5', vendor: ' Uber ', billable: true }).row, { expense_date: '2026-10-30', amount_cents: 500, vendor: 'Uber', category_id: null, crm_email: null, tt_project_id: null, billable: true, note: null })
  assert.ok('error' in X.parseExpense({ expense_date: 'x', amount: '5', vendor: 'a' })); assert.ok('error' in X.parseExpense({ expense_date: '2026-10-30', amount: '5', vendor: ' ' }))
  assert.deepEqual(X.parseExpense({ note: 'hi' }, true).row, { note: 'hi' })
  assert.ok('error' in X.parseExpense({ crm_email: 'nope' }, true))
})
test('migration: additive, owner RLS, private capped bucket, invoice delete unbills, flag off', () => {
  const m = read('supabase/migrations/20261030b_expenses.sql')
  assert.doesNotMatch(m, /drop table|truncate|delete from/i)
  assert.match(m, /'time','expenses','all'/)
  assert.match(m, /invoice_id uuid references public\.inv_invoices\(id\) on delete set null/)
  assert.match(m, /new\.invoiced_at := null/)
  assert.match(m, /values \('ex-receipts', 'ex-receipts', false, 10485760/)
  assert.match(m, /524288000/)
  assert.doesNotMatch(m, /to anon/)
  assert.match(m, /\('expenses_public', false/)
  for (const t of ['ex_categories', 'ex_expenses']) assert.match(m, new RegExp(`alter table public\\.${t} enable row level security`))
})
test('routes: guarded, demo blocks writes, nothing sends email', () => {
  const dir = path.join(root, 'app/api/expenses')
  const files = []; const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((f) => f.isDirectory() ? walk(path.join(d, f.name)) : files.push(path.join(d, f.name))); walk(dir)
  assert.ok(files.length >= 7)
  for (const f of files) { const s = fs.readFileSync(f, 'utf8'); assert.match(s, /exGuard\((true|false)\)/, f); assert.doesNotMatch(s, /resend|sendEmail|nodemailer|service_role|SUPABASE_SECRET/i, f) }
  assert.match(read('lib/expenses/guard.ts'), /if \(write && demo\)/)
  assert.match(read('app/api/expenses/[id]/receipt/route.ts'), /MAX_RECEIPT_BYTES/); assert.match(read('app/api/expenses/[id]/receipt/route.ts'), /STORAGE_CAP_BYTES/)
})
test('registry: tool id expenses, route /expenses, launch flag expenses, priced, in build args', () => {
  const t = read('tools/expenses/tool.ts'); assert.match(t, /id: 'expenses'/); assert.match(t, /route: '\/expenses'/); assert.match(t, /launchFlag: 'expenses'/)
  assert.match(read('tools/registry.ts'), /expenses: on\(process\.env\.NEXT_PUBLIC_EXPENSES_ENABLED\)/)
  assert.match(read('lib/plans.ts'), /NEXT_PUBLIC_STRIPE_LINK_EXPENSES_MONTHLY/)
  for (const f of ['Dockerfile', 'docker-compose.yml']) { const s = read(f); for (const v of ['NEXT_PUBLIC_EXPENSES_ENABLED', 'NEXT_PUBLIC_STRIPE_LINK_EXPENSES_MONTHLY', 'NEXT_PUBLIC_STRIPE_LINK_EXPENSES_YEARLY']) assert.ok(s.includes(v), f + v) }
})
