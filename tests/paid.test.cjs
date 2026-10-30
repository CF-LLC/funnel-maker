const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const P = jiti('../lib/paid/core.ts')
const D = jiti('../lib/paid/demo.ts')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const inv = (id, number, client_name, total) => ({ id, number, client_name, total, currency: 'USD', due_date: '2026-10-01', issue_date: '2026-09-01' })

test('csv: quotes, escaped quotes, CRLF, semicolons, BOM', () => {
  assert.deepEqual(P.parseCsv('\uFEFFa,b\r\n"x, y","he said ""hi"""\r\n'), [['a', 'b'], ['x, y', 'he said "hi"']])
  assert.deepEqual(P.parseCsv('Date;Amount\n2026-10-01;12,50'), [['Date', 'Amount'], ['2026-10-01', '12,50']])
})
test('amounts and dates', () => {
  assert.equal(P.parseAmount('$1,234.50'), 123450); assert.equal(P.parseAmount('(12.00)'), -1200); assert.equal(P.parseAmount('-5'), -500)
  assert.equal(P.parseAmount('20.00 CR'), 2000); assert.equal(P.parseAmount('abc'), null); assert.equal(P.parseAmount(''), null)
  assert.equal(P.parseDate('2026-10-03'), '2026-10-03'); assert.equal(P.parseDate('10/3/2026'), '2026-10-03'); assert.equal(P.parseDate('3/10/2026', 'dmy'), '2026-10-03')
  assert.equal(P.parseDate('2/30/2026'), null); assert.equal(P.parseDate('Oct 3, 2026'), '2026-10-03')
})
test('mapping: guess, clean, ready', () => {
  const m = P.guessMapping(['Posted Date', 'Description', 'Debit', 'Credit'])
  assert.equal(m.date, 'Posted Date'); assert.equal(m.credit, 'Credit'); assert.equal(m.debit, 'Debit'); assert.ok(P.mappingReady(m))
  const a = P.guessMapping(['Date', 'Memo', 'Amount']); assert.equal(a.amount, 'Amount'); assert.equal(a.description, 'Memo')
  assert.equal(P.cleanMapping({ date: 'Nope', description: 'Memo', amount: 'Amount' }, ['Date', 'Memo', 'Amount']).date, '')
  assert.equal(P.cleanMapping('x'), null)
})
test('credits only: debits ignored (single amount column and credit/debit columns)', () => {
  const one = P.extractCredits(P.parseCsv('Date,Memo,Amount\n2026-10-01,A,100.00\n2026-10-02,B,-40.00\n,C,5\n'), { date: 'Date', description: 'Memo', amount: 'Amount' })
  assert.equal(one.credits.length, 1); assert.equal(one.credits[0].amountCents, 10000); assert.equal(one.skipped.debits, 1); assert.equal(one.skipped.unreadable, 1)
  const two = P.extractCredits(P.parseCsv(D.demoCsv()), P.guessMapping(P.parseCsv(D.demoCsv())[0]))
  assert.equal(two.credits.length, 5); assert.equal(two.skipped.debits, 1)
})
test('matching tiers: exact, likely, possible, unmatched; each invoice used once', () => {
  const invs = [inv('a', 'INV-0042', 'Acme Studio', 50000), inv('b', 'INV-0043', 'Birch Dental', 25000), inv('c', 'INV-0044', 'Cedar Cafe', 25000)]
  const c = (key, desc, cents) => ({ key, row: 2, date: '2026-10-05', description: desc, amountCents: cents })
  const out = P.matchCredits([c('1', 'TRANSFER ACME STUDIO', 50000), c('2', 'payment inv0043', 24900), c('3', 'DEPOSIT', 25000), c('4', 'INTEREST', 13), c('5', 'acme again', 50000)], invs, 500)
  const by = Object.fromEntries(out.map((s) => [s.credit.key, s]))
  assert.equal(by['1'].tier, 'exact'); assert.equal(by['1'].invoice.id, 'a')
  assert.equal(by['2'].tier, 'likely'); assert.equal(by['2'].invoice.id, 'b')
  assert.equal(by['3'].invoice.id, 'c'); assert.equal(by['4'].tier, 'unmatched'); assert.equal(by['4'].invoice, null)
  assert.notEqual(by['5'].invoice && by['5'].invoice.id, 'a')
  // Amount-only with two equal invoices is downgraded and flagged.
  const tie = P.matchCredits([c('t', 'DEPOSIT', 25000)], invs.slice(1), 0)[0]
  assert.equal(tie.tier, 'possible'); assert.ok(tie.reasons.includes('Other invoices match too'))
  // Tolerance 0 means near amounts don't count.
  assert.equal(P.matchCredits([c('n', 'DEPOSIT', 24999)], [invs[0]], 0)[0].tier, 'unmatched')
})
test('demo sample gives a mix of tiers', () => {
  const rows = P.parseCsv(D.demoCsv()); const tiers = P.matchCredits(P.extractCredits(rows, P.guessMapping(rows[0])).credits, D.demoInvoices(), 500).map((s) => s.tier)
  for (const t of ['exact', 'likely', 'possible', 'unmatched']) assert.ok(tiers.includes(t), t)
})
test('payer text: max 40 chars, no 6+ digit runs (account/reference numbers)', () => {
  const s = P.safePayer('ONLINE TRANSFER FROM MAPLE REF 88412093 ACCT 1234-5678-9012 and more words here')
  assert.ok(s.length <= 40); assert.ok(!/\d{6,}/.test(s)); assert.ok(!/1234/.test(s)); assert.equal(P.safePayer('123456789'), null)
  assert.equal(P.safePayer('INV 1042'), 'INV 1042')
  assert.equal(P.cleanNote('  Partial   payment '), 'Partial payment'); assert.equal(P.cleanNote(''), null)
})
test('privacy: no bank file or raw rows reach the server', () => {
  const app = read('components/paid/app.tsx')
  const posts = app.match(/api\('\/api\/paid[^']*', '(POST|PUT)', \{[^}]*\}/g) || []
  assert.equal(posts.length, 3)
  for (const p of posts) { assert.ok(!/rows|description|paste|text\b/.test(p.replace(/safePayer\(s\.credit\.description\)/, '')), p) }
  assert.ok(!/upload|storage/i.test(read('app/api/paid/confirm/route.ts')))
  const mig = read('supabase/migrations/20261030d_paid.sql')
  assert.match(mig, /payer !~ '\[0-9\]\{6,\}'/); assert.match(mig, /char_length\(payer\) <= 40/)
  assert.ok(!/create table[^;]*(csv|raw|bank_rows)/i.test(mig))
  assert.match(read('app/api/paid/confirm/route.ts'), /safePayer\(b\.payer\)/)
})
test('guards: auth → access → demo blocks writes; flag ships off', () => {
  const g = read('lib/paid/guard.ts'); assert.match(g, /hasAccess\(user, 'paid'\)/); assert.match(g, /if \(write && demo\)/)
  for (const f of ['mapping', 'confirm', 'undo']) assert.match(read(`app/api/paid/${f}/route.ts`), /pdGuard\(true\)/)
  assert.match(read('app/api/paid/route.ts'), /pdGuard\(false\)/)
  const mig = read('supabase/migrations/20261030d_paid.sql')
  assert.match(mig, /'paid_public', false/); assert.match(mig, /'reports','paid','all'/)
  assert.match(read('tools/registry.ts'), /paid: on\(process\.env\.NEXT_PUBLIC_PAID_ENABLED\)/)
  assert.match(read('app/invoices/page.tsx'), /pd_matches/)
})
