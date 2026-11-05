// Clients phase 1: website, paused, soft archive. Session owner only. No delete, no service role.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@/lib/crm/guard': path.join(__dirname, 'stubs/crm-guard-stub.cjs'), '@/lib/supabase': path.join(__dirname, 'stubs/supabase-stub.cjs'), '@': root } })
const A = jiti('../app/api/crm/archive/route.ts')
const C = jiti('../app/api/crm/contact/route.ts')
const G = require('./stubs/crm-guard-stub.cjs').__state
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')
const U1 = { id: '11111111-1111-1111-1111-111111111111' }
const U2 = { id: '22222222-2222-2222-2222-222222222222' }
const reset = (user = U1) => {
  G.user = user; G.access = true; G.demo = false; G.inserts = []; G.updates = []; G.upserts = []
  G.rows = [
    { user_id: U1.id, email: 'maya@example.com', name: 'Maya', company: 'Lopez Wellness', status: 'active', archived_at: null },
    { user_id: U2.id, email: 'maya@example.com', name: 'Theirs', company: 'Other Co', status: 'active', archived_at: null },
  ]
}
const post = (body, ct = 'application/json') => A.POST(new Request('https://saasnation.site/api/crm/archive', { method: 'POST', headers: { 'content-type': ct }, body: typeof body === 'string' ? body : JSON.stringify(body) }))
const put = (body) => C.PUT(new Request('https://saasnation.site/api/crm/contact', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }))

test('archive: signed out, no Clients access, and demo cannot write', async () => {
  reset(null); assert.equal((await post({ email: 'maya@example.com', archived: true })).status, 401)
  reset(); G.access = false; assert.equal((await post({ email: 'maya@example.com', archived: true })).status, 403)
  reset(); G.demo = true; assert.equal((await post({ email: 'maya@example.com', archived: true })).status, 403)
  reset(); assert.equal((await post('email=maya@example.com', 'application/x-www-form-urlencoded')).status, 415)
  assert.equal(G.updates.length, 0); assert.equal(G.inserts.length, 0)
  assert.equal(G.rows.find((r) => r.user_id === U2.id).archived_at, null)
})

test('archive and restore touch only the session owner row', async () => {
  reset()
  const r = await post({ email: ' MAYA@example.com ', archived: true, user_id: U2.id })
  assert.equal(r.status, 200)
  const j = await r.json()
  assert.equal(j.email, 'maya@example.com'); assert.ok(j.archived_at)
  const mine = G.rows.find((x) => x.user_id === U1.id)
  const theirs = G.rows.find((x) => x.user_id === U2.id)
  assert.equal(mine.archived_at, j.archived_at)
  assert.equal(mine.name, 'Maya'); assert.equal(mine.company, 'Lopez Wellness')
  assert.equal(theirs.archived_at, null); assert.equal(theirs.name, 'Theirs')
  assert.equal(G.updates[0].filter.user_id, U1.id)
  const back = await post({ email: 'maya@example.com', archived: false })
  assert.equal((await back.json()).archived_at, null)
  assert.equal(G.rows.find((x) => x.user_id === U1.id).archived_at, null)
  assert.equal(G.rows.find((x) => x.user_id === U2.id).name, 'Theirs')
})

test('archiving an email the owner has not saved does not invent a name or touch the other tenant', async () => {
  reset()
  const r = await post({ email: 'new@example.com', archived: true, name: 'Forged', company: 'Forged Co', user_id: U2.id })
  assert.equal(r.status, 200)
  const created = G.inserts[0]
  assert.equal(created.user_id, U1.id); assert.equal(created.email, 'new@example.com')
  assert.ok(created.archived_at); assert.equal(created.name, undefined); assert.equal(created.company, undefined)
  assert.equal(G.rows.find((x) => x.user_id === U2.id).name, 'Theirs')
  reset()
  assert.equal((await post({ email: 'missing@example.com', archived: false })).status, 404)
  assert.equal(G.inserts.length, 0)
})

test('forged owner on update is rejected and does not change the other tenant', async () => {
  reset()
  const stub = require('./stubs/crm-guard-stub.cjs')
  const res = await stub.openDb().from('crm_contacts').update({ archived_at: '2099-01-01T00:00:00Z' }).eq('user_id', U2.id).eq('email', 'maya@example.com').select('email, archived_at').maybeSingle()
  assert.equal(res.error.code, '42501')
  assert.equal(G.rows.find((r) => r.user_id === U2.id).archived_at, null)
  assert.equal(G.rows.find((r) => r.user_id === U1.id).archived_at, null)
  const route = read('app/api/crm/archive/route.ts')
  assert.match(route, /user_id: g\.user\.id/)
  assert.match(route, /\.eq\('user_id', g\.user\.id\)/)
  assert.doesNotMatch(route, /delete\(|service_role|SERVICE_ROLE|createAdminClient/)
  const contact = read('app/api/crm/contact/route.ts')
  assert.match(contact, /user_id: g\.user\.id/)
  assert.doesNotMatch(contact, /service_role|SERVICE_ROLE|createAdminClient/)
})

test('edit saves website and paused on the session row and does not clear archive or remap name', async () => {
  reset()
  G.rows[0].archived_at = '2026-10-01T00:00:00Z'
  const bad = await put({ email: 'maya@example.com', website: 'javascript:alert(1)', user_id: U2.id })
  assert.equal(bad.status, 400); assert.equal(G.upserts.length, 0)
  const ok = await put({ email: 'maya@example.com', name: 'Maya Lopez', company: 'Lopez Wellness', website: 'https://lopez.example/path', status: 'paused', user_id: U2.id })
  assert.equal(ok.status, 200)
  const row = G.upserts[0]
  assert.equal(row.user_id, U1.id); assert.equal(row.name, 'Maya Lopez'); assert.equal(row.company, 'Lopez Wellness')
  assert.equal(row.website, 'https://lopez.example/path'); assert.equal(row.status, 'paused')
  assert.ok(!('archived_at' in row))
  assert.equal(G.rows.find((r) => r.user_id === U1.id).archived_at, '2026-10-01T00:00:00Z')
  assert.equal(G.rows.find((r) => r.user_id === U2.id).company, 'Other Co')
})

test('labels stay person vs business, and the migration is additive', () => {
  const form = read('components/crm/add-client-form.tsx')
  const detail = read('components/crm/contact-detail.tsx')
  assert.match(form, /Contact person/); assert.match(form, /Company \/ business/); assert.match(form, /Website/)
  assert.match(detail, /Contact person/); assert.match(detail, /Company \/ business/); assert.match(detail, /data-archive-toggle/)
  assert.match(read('components/crm/contact-list.tsx'), /data-archived-filter/)
  const sql = read('supabase/migrations/20261105195825_clients_website_paused_archive.sql')
  assert.match(sql, /add column if not exists website/)
  assert.match(sql, /add column if not exists archived_at/)
  assert.match(sql, /'lead', 'active', 'paused', 'past', 'not_a_fit'/)
  assert.doesNotMatch(sql, /\b(drop table|truncate|delete from|update public\.crm_contacts set)\b/i)
  assert.doesNotMatch(sql, /feature_flags|workspace_v2|homepage/)
  assert.doesNotMatch(read('supabase/migrations/20261102a_workspace_v2_flag.sql') + read('supabase/migrations/20261103a_homepage_v2_flag.sql'), /paused|archived_at/)
})
