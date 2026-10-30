const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const R = jiti('../lib/reports/core.ts')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const T = R.defaultTemplate()
const rep = (month, kv, o = {}) => ({ month, title: 't', layout: T, kpi_values: kv, notes: '', ...o })

test('months: labels, add, validation', () => {
  assert.equal(R.addMonths('2026-01', -1), '2025-12'); assert.equal(R.addMonths('2026-11', 3), '2027-02')
  assert.ok(R.isMonth('2026-10')); assert.ok(!R.isMonth('2026-13')); assert.ok(!R.isMonth('2026-1'))
  assert.equal(R.monthLabel('2026-10'), 'October 2026')
})
test('tokens are 64 hex and urls point at /r/', () => {
  const t = R.newToken(); assert.ok(R.isToken(t)); assert.ok(!R.isToken('demo')); assert.notEqual(t, R.newToken())
  assert.equal(R.clientUrl(t, 'https://x.co/'), `https://x.co/r/${t}`)
})
test('template parsing: keys, caps, chart falls back, slots capped', () => {
  const p = R.parseTemplate({ kpis: [{ label: 'Leads' }, { label: 'Leads' }], sections: [{ type: 'chart', kpi: 'nope' }, { type: 'images', slots: 50 }, { type: 'images', slots: 3 }, { type: 'bogus' }] })
  assert.ok(p.ok); assert.deepEqual(p.template.kpis.map((k) => k.key), ['leads', 'leads_2'])
  assert.equal(p.template.sections[0].kpi, 'leads'); assert.equal(p.template.sections[1].slots, 12); assert.equal(p.template.sections.length, 2)
  assert.equal(R.parseTemplate({ kpis: Array(13).fill({ label: 'a' }), sections: [{ type: 'kpis' }] }).ok, false)
  assert.equal(R.parseTemplate({ kpis: [], sections: [] }).ok, false)
  assert.ok(R.parseTemplate(T).ok)
})
test('numbers: money, percent, parentheses, junk', () => {
  assert.equal(R.parseNumber('$1,234.50'), 1234.5); assert.equal(R.parseNumber('3.2%'), 3.2); assert.equal(R.parseNumber('(40)'), -40)
  assert.equal(R.parseNumber(''), null); assert.equal(R.parseNumber('abc'), undefined); assert.equal(R.parseNumber('1e20'), undefined)
})
test('CSV: name,value rows and header rows; unknowns reported', () => {
  const a = R.valuesFromCsv('metric,value\nVisitors,"1,200"\nRevenue,$4500\nBogus,3\n', T.kpis)
  assert.equal(a.values.visitors, 1200); assert.equal(a.values.revenue, 4500); assert.deepEqual(a.unknown, ['Bogus'])
  const b = R.valuesFromCsv('Visitors,Leads,Conversion\n100,5,5%\n200,8,4%\n', T.kpis)
  assert.equal(b.values.visitors, 200); assert.equal(b.values.leads, 8); assert.equal(b.values.conversion, 4)
  assert.ok(R.valuesFromCsv('x,y\n', T.kpis).error)
})
test('month-over-month: only vs the month right before; percent shows pts; better=down', () => {
  const all = [rep('2026-08-01', { visitors: 100, conversion: 2 }), rep('2026-09-01', { visitors: 150, conversion: 3.5 })]
  const v = R.reportView(all[1], all, [])
  const cards = v.find((s) => s.type === 'kpis').cards
  assert.equal(cards[0].change.label, '+50%'); assert.equal(cards[0].change.good, true)
  assert.equal(cards.find((c) => c.kpi.key === 'conversion').change.label, '+1.5 pts')
  const gap = R.reportView(rep('2026-11-01', { visitors: 1 }), [...all, rep('2026-11-01', { visitors: 1 })], [])
  assert.equal(gap.find((s) => s.type === 'kpis').cards[0].change, null)
  assert.equal(R.momChange(80, 100, { format: 'number', better: 'down' }).good, true)
  assert.equal(R.momChange(5, 0, { format: 'currency', better: 'up' }).label, '+$5.00')
})
test('chart series and geometry', () => {
  const s = R.kpiSeries([rep('2026-08-01', { visitors: 10 }), rep('2026-10-01', { visitors: 30 })], 'visitors', '2026-10', 3)
  assert.deepEqual(s.map((x) => x.value), [10, null, 30])
  const g = R.chartGeometry(s, 300, 100); assert.equal(g.bars[1], null); assert.ok(g.bars[2].h > g.bars[0].h)
})
test('duplicate keeps layout, blanks numbers, renames month', () => {
  const d = R.duplicateRow({ layout: T, title: 'Acme: September 2026', month: '2026-09-01' }, '2026-10')
  assert.equal(d.title, 'Acme: October 2026'); assert.deepEqual(d.kpi_values, {}); assert.equal(d.month, '2026-10-01'); assert.equal(d.shared, false)
})
test('mailto invite has no secrets but the link; pdf file name safe', () => {
  const m = R.mailtoInvite('a@b.co', 'Maple Bakery', 'Riverside', 'https://x/r/abc'); assert.match(m, /^mailto:a%40b\.co\?subject=/); assert.match(decodeURIComponent(m), /https:\/\/x\/r\/abc/)
  assert.equal(R.pdfFileName('Maple & Co!', '2026-10'), 'report-maple-co-2026-10.pdf')
})
test('migration: additive, owner RLS, private capped bucket, token not insertable, flag off', () => {
  const m = read('supabase/migrations/20261030c_reports.sql')
  assert.doesNotMatch(m, /drop table|truncate|delete from/i)
  assert.match(m, /'expenses','reports','all'/)
  assert.match(m, /'rp-files', 'rp-files', false, 10485760/)
  assert.match(m, /524288000/)
  assert.doesNotMatch(m, /to anon/)
  assert.match(m, /\('reports_public', false/)
  for (const t of ['rp_brand', 'rp_clients', 'rp_reports', 'rp_images']) assert.match(m, new RegExp(`alter table public\\.${t} enable row level security`))
})
test('routes: guarded, demo blocks writes, no email, public page noindex + rate limited', () => {
  const files = []; const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((f) => f.isDirectory() ? walk(path.join(d, f.name)) : files.push(path.join(d, f.name))); walk(path.join(root, 'app/api/reports'))
  assert.ok(files.length >= 9)
  for (const f of files) { const s = fs.readFileSync(f, 'utf8'); assert.match(s, /rpGuard\((true|false)\)/, f); assert.doesNotMatch(s, /resend|sendEmail|nodemailer/i, f) }
  assert.match(read('lib/reports/guard.ts'), /if \(write && demo\)/)
  const pg = read('app/r/[token]/page.tsx'); assert.match(pg, /index: false/); assert.match(pg, /rateLimit\(/); assert.match(pg, /MadeWith tool="reports"/)
  assert.match(read('app/r/[token]/pdf/route.tsx'), /rateLimit\(/)
  assert.match(read('lib/reports/server.ts'), /SIGNED_TTL_SECONDS/)
  assert.equal(R.REPORTS_SENDS_EMAIL, false)
})
test('registry: tool id reports, route /reports, flag reports, priced, in build args', () => {
  const t = read('tools/reports/tool.ts'); assert.match(t, /id: 'reports'/); assert.match(t, /route: '\/reports'/); assert.match(t, /launchFlag: 'reports'/)
  assert.match(read('tools/registry.ts'), /reports: on\(process\.env\.NEXT_PUBLIC_REPORTS_ENABLED\)/)
  assert.match(read('lib/plans.ts'), /reports: \{ monthly: process\.env\.NEXT_PUBLIC_STRIPE_LINK_REPORTS_MONTHLY, yearly: process\.env\.NEXT_PUBLIC_STRIPE_LINK_REPORTS_YEARLY \}/)
  for (const f of ['Dockerfile', 'docker-compose.yml', '.env.example']) { const s = read(f); for (const v of ['NEXT_PUBLIC_REPORTS_ENABLED', 'NEXT_PUBLIC_STRIPE_LINK_REPORTS_MONTHLY', 'NEXT_PUBLIC_STRIPE_LINK_REPORTS_YEARLY']) assert.ok(s.includes(v), f + v) }
})
