const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const P = jiti('../lib/proposals/core.ts')
const reg = jiti('../tools/registry.ts')
const { parsePriceMap } = jiti('../lib/stripe-webhook.ts')
const uuid = '11111111-2222-4333-8444-555555555555'

test('proposals tool: registered at /proposals, sold separately, price map accepts it', () => {
  const t = reg.getTool('proposals'); assert.equal(t.route, '/proposals'); assert.equal(t.accessKey, 'proposals')
  assert.ok(reg.SOLD_ACCESS_KEYS.includes('proposals')); assert.ok(!reg.isIncludedTool('proposals'))
  assert.ok(reg.isProtectedPath('/proposals/new')); assert.ok(!reg.isProtectedPath('/u/coop/p/' + uuid))
  assert.equal(parsePriceMap(JSON.stringify({ plink_x: { tool: 'proposals' } })).plink_x.tool, 'proposals')
})

test('statuses: expired is computed only for sent proposals past their expiry day', () => {
  assert.deepEqual([...P.STATUSES], ['draft', 'sent', 'accepted', 'declined', 'expired'])
  const today = '2026-10-24'
  assert.equal(P.effectiveStatus({ status: 'sent', expires_on: '2026-10-23' }, today), 'expired')
  assert.equal(P.effectiveStatus({ status: 'sent', expires_on: '2026-10-24' }, today), 'sent')
  assert.equal(P.effectiveStatus({ status: 'sent', expires_on: null }, today), 'sent')
  assert.equal(P.effectiveStatus({ status: 'accepted', expires_on: '2026-01-01' }, today), 'accepted')
  assert.equal(P.effectiveStatus({ status: 'draft', expires_on: '2026-01-01' }, today), 'draft')
  assert.ok(P.canRespond({ status: 'sent', expires_on: null }, today))
  assert.ok(!P.canRespond({ status: 'sent', expires_on: '2026-10-01' }, today))
  assert.ok(!P.canRespond({ status: 'declined', expires_on: null }, today))
  assert.equal(P.todayChicago(new Date('2026-10-25T03:00:00Z')), '2026-10-24')
})

test('proposal schema requires a saved client, title and items', () => {
  const base = { clientId: uuid, title: 'Coaching', intro: 'Hi', currency: 'usd', expiresOn: '', lines: [{ description: 'Lesson', quantity: '2', price: '50' }] }
  const r = P.proposalSchema.parse(base); assert.equal(r.currency, 'USD'); assert.equal(r.lines[0].quantity, 2)
  assert.equal(P.proposalSchema.safeParse({ ...base, clientId: '' }).success, false)
  assert.equal(P.proposalSchema.safeParse({ ...base, title: ' ' }).success, false)
  assert.equal(P.proposalSchema.safeParse({ ...base, lines: [] }).success, false)
  assert.equal(P.proposalSchema.safeParse({ ...base, expiresOn: 'soon' }).success, false)
  assert.equal(P.proposalSchema.safeParse({ ...base, intro: 'x'.repeat(2001) }).success, false)
})

test('accept needs a typed name; decline does not', () => {
  assert.equal(P.respondSchema.safeParse({ handle: 'coop', id: uuid, action: 'accept', name: '' }).success, false)
  assert.equal(P.respondSchema.safeParse({ handle: 'coop', id: uuid, action: 'accept', name: 'Jane Doe' }).success, true)
  assert.equal(P.respondSchema.safeParse({ handle: 'coop', id: uuid, action: 'decline' }).success, true)
  assert.equal(P.respondSchema.safeParse({ handle: 'coop', id: 'nope', action: 'decline' }).success, false)
  assert.equal(P.respondSchema.safeParse({ handle: 'coop', id: uuid, action: 'pay' }).success, false)
})

test('accepted proposal converts to an invoice with the same client and items', () => {
  const p = { id: uuid, client_id: uuid, client_name: 'Jane', client_email: 'j@x.co', client_address: null, title: 'Coaching', currency: 'USD', accepted_name: 'Jane Doe', responded_at: '2026-10-20T15:00:00Z' }
  const lines = [{ position: 1, description: 'B', quantity: '1.00', unit_price_cents: '500' }, { position: 0, description: 'A', quantity: 2, unit_price_cents: 1000 }]
  const { invoice, lines: out } = P.proposalToInvoice(p, lines, { business_name: 'CF LLC', pay_link: 'https://buy.stripe.com/x' }, P.nextInvoiceNumber(4), '2026-10-24')
  assert.equal(invoice.number, 'INV-0005'); assert.equal(invoice.client_id, uuid); assert.equal(invoice.client_name, 'Jane'); assert.equal(invoice.client_email, 'j@x.co')
  assert.equal(invoice.issue_date, '2026-10-24'); assert.equal(invoice.due_date, '2026-11-07'); assert.equal(invoice.seller_name, 'CF LLC')
  assert.match(invoice.notes, /accepted by Jane Doe on 2026-10-20/)
  assert.deepEqual(out, [{ position: 0, description: 'A', quantity: 2, unit_price_cents: 1000 }, { position: 1, description: 'B', quantity: 1, unit_price_cents: 500 }])
  assert.equal(P.nextInvoiceNumber(4, 2), 'INV-0007')
  assert.equal(P.publicProposalPath('coop', uuid), `/@coop/p/${uuid}`)
})

test('migration is additive, gates in the DB, and the API stays email/payment free', () => {
  const sql = fs.readFileSync(path.join(root, 'supabase/migrations/20261024_proposals.sql'), 'utf8')
  assert.match(sql, /'funnels', 'invoices', 'linkinbio', 'forms', 'proposals', 'all'/)
  assert.match(sql, /tool in \('proposals', 'all'\) and active/)
  assert.match(sql, /public\.prp_has_access\(auth\.uid\(\)\)/)
  assert.doesNotMatch(sql, /delete from|truncate|drop table|drop policy/i)
  assert.doesNotMatch(sql, /source = 'founding'/)
  assert.doesNotMatch(sql, /prp_proposals_delete_own/)
  assert.match(fs.readFileSync(path.join(root, 'next.config.mjs'), 'utf8'), /source: '\/@:handle\/p\/:id', destination: '\/u\/:handle\/p\/:id'/)
  const api = fs.readFileSync(path.join(root, 'app/api/proposals/respond/route.ts'), 'utf8')
  assert.match(api, /verifyTurnstile/); assert.match(api, /rateLimit/); assert.match(api, /\.eq\('status', 'sent'\)/)
  assert.doesNotMatch(api, /sendEmail|resend|stripe/i)
  assert.match(fs.readFileSync(path.join(root, 'app/proposals/layout.tsx'), 'utf8'), /hasAccess\(user, 'proposals'\)/)
})
