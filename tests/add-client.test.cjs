// Add client: validation, normalization, duplicates, auth, owner from session, redirect, buttons and re-pointed links.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@/lib/crm/guard': path.join(__dirname, 'stubs/crm-guard-stub.cjs'), '@/lib/supabase': path.join(__dirname, 'stubs/supabase-stub.cjs'), '@': root } })
const V = jiti('../lib/crm/add-client.ts')
const R = jiti('../app/api/crm/clients/route.ts')
const T = jiti('../lib/me/today-core.ts')
const S = jiti('../lib/me/setup-core.ts')
const G = require('./stubs/crm-guard-stub.cjs').__state
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')
const U1 = { id: '11111111-1111-1111-1111-111111111111' }, U2 = { id: '22222222-2222-2222-2222-222222222222' }
const reset = (user = U1) => { G.user = user; G.access = true; G.demo = false; G.inserts = []; G.rows = [{ user_id: U2.id, email: 'maya@example.com', name: 'Theirs', company: 'Other', phone: null }] }
const post = (body, ct = 'application/json') => R.POST(new Request('https://saasnation.site/api/crm/clients', { method: 'POST', headers: { 'content-type': ct }, body: typeof body === 'string' ? body : JSON.stringify(body) }))

test('validation: required name/email, email format, lengths, phone characters; plain errors', () => {
  const ok = V.validateAddClient({ name: ' Maya Lopez ', email: '  Maya@Example.COM ', company: '', phone: '' })
  assert.deepEqual(ok, { ok: true, value: { name: 'Maya Lopez', email: 'maya@example.com', company: null, phone: null, website: null } })
  assert.equal(V.validateAddClient({ name: 'A', email: 'a@b.co', company: ' Acme ', phone: '+1 (555) 010-2030' }).value.phone, '+1 (555) 010-2030')
  const f = (b) => V.validateAddClient(b)
  assert.equal(f({ email: 'a@b.co' }).field, 'name')
  assert.equal(f({ name: '   ', email: 'a@b.co' }).field, 'name')
  assert.equal(f({ name: 'x'.repeat(201), email: 'a@b.co' }).field, 'name')
  assert.equal(f({ name: 'A' }).field, 'email')
  assert.equal(f({ name: 'A', email: 'not-an-email' }).field, 'email')
  assert.equal(f({ name: 'A', email: 'a@b.co', phone: '555<script>' }).field, 'phone')
  assert.equal(f({ name: 'A', email: 'a@b.co', phone: '---' }).field, 'phone')
  assert.equal(f({ name: 'A', email: 'a@b.co', company: 'c'.repeat(201) }).field, 'company')
  assert.equal(f({ name: 'A', email: 'a@b.co', company: 5 }).field, 'company')
  assert.equal(f({ name: 'A', email: 'a@b.co', website: 'javascript:alert(1)' }).field, 'website')
  assert.equal(f({ name: 'A', email: 'a@b.co', website: 'https://user:pass@example.com' }).field, 'website')
  assert.equal(f({ name: 'A', email: 'a@b.co', website: 'brightpixel.studio' }).value.website, 'https://brightpixel.studio')
  assert.equal(f(null).field, 'form'); assert.equal(f([]).field, 'form')
  assert.match(f({ name: 'A', email: 'nope' }).error, /looks invalid/)
})

test('auth required; no Clients access = 403; demo cannot write; JSON only (CSRF)', async () => {
  reset(null); assert.equal((await post({ name: 'A', email: 'a@b.co' })).status, 401)
  reset(); G.access = false; assert.equal((await post({ name: 'A', email: 'a@b.co' })).status, 403)
  reset(); G.demo = true; assert.equal((await post({ name: 'A', email: 'a@b.co' })).status, 403)
  reset(); assert.equal((await post('name=A&email=a@b.co', 'application/x-www-form-urlencoded')).status, 415)
  assert.equal((await post('{bad', 'application/json')).status, 400)
  assert.equal(G.inserts.length, 0)
})

test('saves normalized email with user_id from the session (body user_id ignored), redirect with confirmation', async () => {
  reset()
  const r = await post({ name: 'Maya Lopez', email: ' MAYA@Example.com ', company: 'Acme', phone: '555 0100', user_id: U2.id })
  assert.equal(r.status, 201)
  assert.deepEqual(await r.json(), { ok: true, href: '/crm/maya%40example.com?added=1' })
  assert.equal(G.inserts.length, 1)
  const row = G.inserts[0]
  assert.equal(row.user_id, U1.id); assert.equal(row.email, 'maya@example.com'); assert.equal(row.company, 'Acme'); assert.equal(row.phone, '555 0100'); assert.equal(row.website, null)
  assert.ok(!('status' in row), 'status left to the column default')
  const theirs = G.rows.find((x) => x.user_id === U2.id)
  assert.deepEqual(theirs, { user_id: U2.id, email: 'maya@example.com', name: 'Theirs', company: 'Other', phone: null }, 'other users\' rows untouched')
})

test('duplicate (same user + normalized email): 409, plain message + link, nothing overwritten', async () => {
  reset(); G.rows.push({ user_id: U1.id, email: 'sam@x.io', name: 'Sam', company: null, phone: null })
  const r = await post({ name: 'Someone Else', email: 'SAM@x.io ', company: 'New Co' })
  assert.equal(r.status, 409)
  const j = await r.json()
  assert.equal(j.error, 'You already have a client with that email'); assert.equal(j.href, '/crm/sam%40x.io'); assert.equal(j.duplicate, true)
  assert.equal(G.inserts.length, 0)
  assert.deepEqual(G.rows.find((x) => x.user_id === U1.id), { user_id: U1.id, email: 'sam@x.io', name: 'Sam', company: null, phone: null })
})

test('route uses the session-bound guard, insert (never upsert), and no service role', () => {
  const s = read('app/api/crm/clients/route.ts')
  assert.match(s, /crmGuard\(true\)/); assert.match(s, /user_id: g\.user\.id/); assert.doesNotMatch(s, /upsert|service_role|SERVICE_ROLE|createAdminClient/)
})

test('/crm: Add client button in the header and in the empty state; /crm/new gated like /crm', () => {
  const s = read('components/crm/contact-list.tsx')
  assert.match(s, /href="\/crm\/new" data-add-client /)
  assert.match(s, /href="\/crm\/new" data-add-client-empty/)
  const p = read('app/crm/new/page.tsx')
  assert.match(p, /hasAccess\(user, 'crm'\)/); assert.match(p, /<AddClientForm/)
  assert.match(read('components/crm/add-client-form.tsx'), /\/api\/crm\/clients/)
  assert.match(read('app/crm/[contactId]/page.tsx'), /added === '1'/)
})

test('links re-pointed: Today empty state, Get set up step 1, picker hint; wording follows client state', () => {
  assert.equal(T.TODAY_EMPTY.href, '/crm/new')
  assert.deepEqual(T.todayEmpty(false, new Set(['crm'])), { text: 'Nothing needs you today.', cta: 'Create your first client', href: '/crm/new' })
  assert.equal(T.todayEmpty(true, new Set(['crm'])).cta, 'Add a client')
  assert.equal(T.todayEmpty(false, new Set(['invoices'])).href, '/invoices/clients')
  assert.equal(T.todayEmpty(false, new Set()).href, '/pricing')
  assert.equal(S.buildSetup({}, new Set(['crm']))[0].href, '/crm/new')
  assert.equal(S.buildSetup({}, new Set(['invoices']))[0].href, '/invoices/clients')
  assert.match(read('app/dashboard/page.tsx'), /todayEmptyState = todayEmpty\(!!facts\.client, setupAvail\)/)
  assert.match(read('components/clients/client-picker.tsx'), /href="\/crm\/new"/)
  for (const f of ['components/dashboard/today-panel.tsx', 'lib/me/setup-core.ts', 'components/clients/client-picker.tsx']) assert.doesNotMatch(read(f), /href[=:]\s*["'{]?\/crm["'}]/)
})
