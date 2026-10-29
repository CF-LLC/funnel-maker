const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const C = jiti('../lib/changelog/core.ts')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const R = (o) => ({ id: 'r', project_id: 'p', title: 'T', description: null, est_kind: 'price', hours: null, price_cents: null, status: 'approved', decided_name: 'Maya', decided_note: null, decided_at: 'x', invoice_id: null, invoiced_at: null, created_at: 'x', ...o })

test('tokens are 64 hex; regenerate uses 32 random bytes', () => {
  assert.ok(C.isToken('a'.repeat(64)) && !C.isToken('demo') && !C.isToken('A'.repeat(64)) && !C.isToken(null))
  assert.equal(C.changelogUrl('ab'), `${C.SITE}/c/ab`)
  assert.match(read('app/api/changelog/projects/[id]/regenerate/route.ts'), /randomBytes\(32\)\.toString\('hex'\)/)
})

test('validation: projects, requests (hours or price), client decisions', () => {
  assert.equal(C.cleanProject({ title: '', client_name: 'x' }).ok, false)
  assert.equal(C.cleanProject({ title: 'x', client_name: 'y', client_email: 'bad' }).ok, false)
  assert.equal(C.cleanProject({ title: 'x', client_name: 'y', currency: 'us' }).ok, false)
  assert.deepEqual(C.cleanProject({ title: ' Site ', client_name: 'Maya', hourly_rate: '85.50', currency: 'eur' }), { ok: true, p: { title: 'Site', client_name: 'Maya', client_email: null, currency: 'EUR', hourly_rate_cents: 8550 } })
  assert.deepEqual(C.cleanRequest({ title: 'Logo', est_kind: 'hours', hours: '1.5' }), { ok: true, r: { title: 'Logo', description: null, est_kind: 'hours', hours: 1.5, price_cents: null } })
  assert.equal(C.cleanRequest({ title: 'Logo', est_kind: 'hours', hours: '-1' }).ok, false)
  assert.equal(C.cleanRequest({ title: 'Logo', price: '0' }).ok, false)
  assert.equal(C.cleanRequest({ title: 'Logo', price: '$1,250' }).r.price_cents, 125000)
  assert.equal(C.cleanDecision({ decision: 'approved', name: ' ' }).ok, false)
  assert.equal(C.cleanDecision({ decision: 'maybe', name: 'x' }).ok, false)
  assert.deepEqual(C.cleanDecision({ decision: 'declined', name: 'Maya', note: '' }), { ok: true, d: { status: 'declined', name: 'Maya', note: null } })
})

test('totals and invoice lines: only approved, not-yet-invoiced; hours × rate; positions appended', () => {
  const reqs = [R({ id: 'a', est_kind: 'hours', hours: 2 }), R({ id: 'b', price_cents: 5000 }), R({ id: 'c', price_cents: 999, invoice_id: 'i' }), R({ id: 'd', price_cents: 700, status: 'pending' }), R({ id: 'e', price_cents: 300, status: 'declined' })]
  const t = C.totals(reqs, 8000)
  assert.deepEqual(t, { approved: 16000 + 5000 + 999, pending: 700, declined: 300, ready: 21000, readyCount: 2, pendingCount: 1 })
  const lines = C.toInvoiceLines(reqs, 8000, 3)
  assert.deepEqual(lines.map((l) => [l.position, l.quantity, l.unit_price_cents]), [[3, 2, 8000], [4, 1, 5000]])
  assert.match(lines[0].description, /^Extra: T \(approved by Maya\)/)
})

test('export reuses the Invoices tables (no new invoice feature): new unpaid invoice or append to an unpaid one', () => {
  const ex = read('app/api/changelog/export/route.ts')
  assert.match(ex, /from\('inv_invoices'\)\.insert/); assert.match(ex, /from\('inv_invoice_lines'\)\.insert/)
  assert.match(ex, /status !== 'unpaid'/); assert.match(ex, /nextInvoiceNumber/); assert.match(ex, /23505/)
  assert.match(ex, /\.is\('invoice_id', null\)/)
  assert.ok(!fs.existsSync(path.join(root, 'app/change-log/invoices')))
})

test('never sends email; mailto only', () => {
  assert.equal(C.CHANGELOG_SENDS_EMAIL, false)
  assert.match(C.mailtoHref('Maya Chen', 'maya@example.com', 'https://x/c/1'), /^mailto:maya%40example\.com\?subject=/)
  const files = ['lib/changelog', 'app/api/changelog', 'app/change-log', 'app/c', 'components/changelog'].flatMap((d) => fs.readdirSync(path.join(root, d), { recursive: true }).filter((f) => /\.tsx?$/.test(f)).map((f) => path.join(d, f)))
  assert.ok(files.length > 10)
  for (const f of files) assert.doesNotMatch(read(f), /resend|sendEmail|sendMail|nodemailer/i, f)
})

test('public page + decide route: noindex, rate limited, revoked + access checked, pending-only, demo stores nothing', () => {
  const pg = read('app/c/[token]/page.tsx')
  assert.match(pg, /index: false/); assert.match(pg, /rateLimit\(`cl-view/); assert.match(pg, /referrer: 'no-referrer'/)
  const rt = read('app/api/changelog/public/decide/route.ts')
  assert.match(rt, /rateLimit\(`cl-decide/); assert.match(rt, /X-Robots-Tag/); assert.match(rt, /DEMO_TOKEN\) return/)
  const pub = read('lib/changelog/public.ts')
  assert.match(pub, /p\.revoked/); assert.match(pub, /cl_has_access/); assert.match(pub, /\.eq\('status', 'pending'\)/)
  assert.doesNotMatch(pub.split('getPublicLog')[1].split('select(')[0], /user_id/)
})

test('migration: additive, owner-only RLS, column grants, owners cannot forge decisions, flag off', () => {
  const m = read('supabase/migrations/20261029b_changelog.sql')
  assert.doesNotMatch(m, /drop table|drop column|truncate|delete from/i)
  assert.match(m, /'changelog'/); assert.match(m, /'approvals'/)
  assert.match(m, /enable row level security/g)
  assert.match(m, /only the client can answer a request/)
  assert.match(m, /auth\.role\(\)/)
  assert.match(m, /changelog_public', false/)
  assert.doesNotMatch(m, /grant [^;]*update[^;]*\(([^)]*\b(status|decided_name|decided_at)\b)/i)
})

test('owner APIs use the session guard (RLS); writes block demo', () => {
  for (const f of ['app/api/changelog/projects/route.ts', 'app/api/changelog/projects/[id]/route.ts', 'app/api/changelog/requests/route.ts', 'app/api/changelog/requests/[id]/route.ts', 'app/api/changelog/export/route.ts']) {
    const s = read(f); assert.match(s, /clGuard\(true\)/, f); assert.doesNotMatch(s, /serviceClient/, f)
  }
})
