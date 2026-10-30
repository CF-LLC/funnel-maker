// Client list (CRM): aggregation/dedupe, filters, CSV export, launch flag and migration shape.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const C = jiti('../lib/crm/core.ts')
const reg = jiti('../tools/registry.ts')

const A = (o) => ({ id: Math.random().toString(36).slice(2), title: 't', href: '/x', ...o })
const acts = [
  A({ source: 'form', email: ' Maya@Example.com ', name: 'maya', at: '2026-10-01T10:00:00Z' }),
  A({ source: 'booking', email: 'maya@example.com', name: 'Maya Lopez', at: '2026-10-05T10:00:00Z' }),
  A({ source: 'invoice', email: 'MAYA@example.com', at: '2026-10-10T10:00:00Z', amountCents: 150000, currency: 'USD', paid: true }),
  A({ source: 'invoice', email: 'maya@example.com', at: '2026-10-20T10:00:00Z', amountCents: 50000, currency: 'USD', paid: false }),
  A({ source: 'invoice', email: 'maya@example.com', at: '2026-10-21T10:00:00Z', amountCents: 9999, currency: 'EUR', paid: true }),
  A({ source: 'proposal', email: 'sam@example.org', name: 'Sam', at: '2026-10-15T10:00:00Z' }),
  A({ source: 'form', email: 'not-an-email', at: '2026-10-16T10:00:00Z' }),
]

test('dedupes by lowercase email and merges sources, counts, dates and money', () => {
  const list = C.aggregate(acts)
  assert.deepEqual(list.map((c) => c.email), ['maya@example.com', 'sam@example.org'])
  const m = list[0]
  assert.deepEqual(m.sources, ['form', 'booking', 'invoice'])
  assert.deepEqual(m.counts, { form: 1, booking: 1, proposal: 0, invoice: 3 })
  assert.equal(m.firstSeen, '2026-10-01T10:00:00Z'); assert.equal(m.lastActivity, '2026-10-21T10:00:00Z')
  assert.equal(m.name, 'Maya Lopez') // newest non-empty name wins
  assert.equal(m.invoicedCents, 200000); assert.equal(m.paidCents, 150000); assert.equal(m.currency, 'USD') // other currency not summed
  assert.equal(m.status, 'lead'); assert.equal(m.saved, false)
})

test('own CRM rows override name/status/tags and can add contacts with no activity', () => {
  const list = C.aggregate(acts, [
    { email: 'SAM@example.org', name: 'Sam Kim', company: 'Acme', status: 'active', tags: ['VIP', 'vip', 'Big Deal'], follow_up_on: '2026-10-25', created_at: '2026-10-15T00:00:00Z' },
    { email: 'new@example.com', status: 'not_a_fit', tags: [], created_at: '2026-09-01T00:00:00Z' },
    { email: 'bad', status: 'lead', tags: [] },
  ])
  const sam = list.find((c) => c.email === 'sam@example.org')
  assert.equal(sam.name, 'Sam Kim'); assert.equal(sam.company, 'Acme'); assert.equal(sam.status, 'active'); assert.ok(sam.saved)
  assert.deepEqual(sam.tags, ['vip', 'big-deal'])
  assert.ok(list.find((c) => c.email === 'new@example.com').sources.length === 0)
  assert.equal(list.length, 3)
})

test('formContact finds email/name/phone from form fields', () => {
  const fields = [{ id: 'a', type: 'short_text', label: 'Company' }, { id: 'b', type: 'short_text', label: 'Your name' }, { id: 'c', type: 'email', label: 'Email' }, { id: 'd', type: 'phone', label: 'Phone' }]
  assert.deepEqual(C.formContact(fields, { a: 'Acme', b: 'Jo', c: 'JO@X.IO', d: '555' }), { email: 'jo@x.io', name: 'Jo', phone: '555' })
  assert.equal(C.formContact([{ id: 'x', type: 'long_text', label: 'Msg' }], { x: 'hi', y: 'a@b.co' }).email, 'a@b.co')
  assert.equal(C.formContact(fields, {}).email, null)
})

test('filters by search, status, source, tag and due follow-ups', () => {
  const list = C.aggregate(acts, [{ email: 'sam@example.org', status: 'active', tags: ['vip'], follow_up_on: '2026-10-20' }])
  const f = (o) => C.filterContacts(list, o, '2026-10-26').map((c) => c.email)
  assert.deepEqual(f({ q: 'LOPEZ' }), ['maya@example.com'])
  assert.deepEqual(f({ status: 'active' }), ['sam@example.org'])
  assert.deepEqual(f({ source: 'booking' }), ['maya@example.com'])
  assert.deepEqual(f({ tag: 'vip' }), ['sam@example.org'])
  assert.deepEqual(f({ due: true }), ['sam@example.org'])
  assert.equal(f({ status: 'bogus', source: 'bogus' }).length, 2)
})

test('CSV export: header, quoting, money and formula injection guard', () => {
  const list = C.aggregate([A({ source: 'invoice', email: 'x@y.co', name: '=HYPERLINK("evil")', at: '2026-10-01T00:00:00Z', amountCents: 12345, paid: true })],
    [{ email: 'x@y.co', company: 'He said "hi", ok', status: 'past', tags: ['a', 'b'] }])
  const csv = C.toCsv(list)
  const [head, row] = csv.trim().split('\r\n')
  assert.equal(head.split(',').length, C.CSV_HEADER.length)
  assert.match(row, /^"x@y\.co","'=HYPERLINK\(""evil""\)",""/)
  assert.match(row, /"He said ""hi"", ok","Past client","a b"/)
  assert.match(row, /"123\.45","123\.45","USD","2026-10-01"/)
  assert.ok(csv.endsWith('\r\n'))
})

test('registry: crm is a sold tool, protected, and hidden from public surfaces unless flagged', () => {
  const t = reg.getTool('crm')
  assert.equal(t.route, '/crm'); assert.ok(reg.isProtectedPath('/crm/a%40b.co'))
  assert.ok(reg.SOLD_ACCESS_KEYS.includes('crm'))
  assert.equal(reg.isToolLaunched(t, { crm: false }), false); assert.equal(reg.isToolLaunched(t, { crm: true }), true)
  if (!['1', 'true'].includes(String(process.env.NEXT_PUBLIC_CRM_ENABLED || '').toLowerCase())) {
    assert.ok(!reg.PUBLIC_TOOLS.some((x) => x.id === 'crm')); assert.ok(!reg.toolsInRow('all').some((x) => x.id === 'crm'))
  }
  const pricing = fs.readFileSync(path.join(root, 'components/pricing-plans.tsx'), 'utf8')
  // CRM is sold at the standing price but only listed when the launch flag is on.
  assert.match(pricing, /GATED: readonly string\[\] = \['crm', 'emaillist', 'downloads', 'portal', 'approvals', 'changelog', 'time', 'expenses', 'reports', 'paid'\]/)
})

test('migration is additive with owner-only RLS', () => {
  const sql = fs.readFileSync(path.join(root, 'supabase/migrations/20261026a_crm.sql'), 'utf8')
  assert.doesNotMatch(sql, /\b(drop table|truncate|delete from)\b/i)
  assert.match(sql, /'dataremoval','crm','all'/)
  for (const t of ['crm_contacts', 'crm_notes']) {
    assert.match(sql, new RegExp(`alter table public\\.${t} enable row level security`))
    for (const op of ['select', 'insert', 'update', 'delete']) assert.match(sql, new RegExp(`${t}_${op}_own on public\\.${t} for ${op} to authenticated`))
  }
  assert.match(sql, /primary key \(user_id, email\)/)
})
