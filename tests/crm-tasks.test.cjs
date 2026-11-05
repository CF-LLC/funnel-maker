// Private manual tasks (Clients phase 2). In-memory guard is not live Postgres RLS.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@/lib/crm/guard': path.join(__dirname, 'stubs/crm-tasks-guard-stub.cjs'), '@/lib/supabase': path.join(__dirname, 'stubs/supabase-stub.cjs'), '@': root } })
const T = jiti('../lib/crm/tasks.ts')
const Create = jiti('../app/api/crm/tasks/route.ts')
const Edit = jiti('../app/api/crm/tasks/[id]/route.ts')
const Done = jiti('../app/api/crm/tasks/[id]/done/route.ts')
const G = require('./stubs/crm-tasks-guard-stub.cjs').__state
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')
const U1 = { id: '11111111-1111-1111-1111-111111111111' }
const U2 = { id: '22222222-2222-2222-2222-222222222222' }
const ID1 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const ID2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const reset = (user = U1) => {
  G.user = user; G.access = true; G.demo = false; G.inserts = []; G.updates = []
  G.rows = [
    { id: ID1, user_id: U1.id, title: 'Send proposal', due_on: '2026-11-01', done_at: null },
    { id: ID2, user_id: U2.id, title: 'Theirs', due_on: '2026-11-02', done_at: null },
  ]
}
const post = (body, ct = 'application/json') => Create.POST(new Request('https://saasnation.site/api/crm/tasks', { method: 'POST', headers: { 'content-type': ct }, body: typeof body === 'string' ? body : JSON.stringify(body) }))
const patch = (id, body) => Edit.PATCH(new Request(`https://saasnation.site/api/crm/tasks/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), { params: Promise.resolve({ id }) })
const done = (id, body) => Done.POST(new Request(`https://saasnation.site/api/crm/tasks/${id}/done`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), { params: Promise.resolve({ id }) })

test('title is required and trimmed; due date is optional and must be a real calendar day', () => {
  assert.equal(T.cleanTitle('  Call Maya  ').title, 'Call Maya')
  assert.equal(T.cleanTitle('   ').ok, false)
  assert.equal(T.cleanTitle('x'.repeat(201)).ok, false)
  assert.equal(T.cleanTitle(5).ok, false)
  assert.equal(T.cleanDue(null).due, null)
  assert.equal(T.cleanDue('').due, null)
  assert.equal(T.cleanDue('2026-11-05').due, '2026-11-05')
  assert.equal(T.cleanDue('2026-02-31').ok, false)
  assert.equal(T.cleanDue('11/05/2026').ok, false)
  assert.equal(T.cleanDue('2026-11-05T00:00:00Z').ok, false)
})

test('groups open tasks into overdue and upcoming, and done tasks into completed', () => {
  const rows = [
    { id: '1', title: 'Late', due_on: '2026-11-01', done_at: null },
    { id: '2', title: 'Today', due_on: '2026-11-05', done_at: null },
    { id: '3', title: 'Later', due_on: '2026-11-20', done_at: null },
    { id: '4', title: 'Someday', due_on: null, done_at: null },
    { id: '5', title: 'Finished late', due_on: '2026-10-01', done_at: '2026-11-04T15:00:00Z' },
  ]
  const g = T.groupTasks(rows, '2026-11-05')
  assert.deepEqual(g.overdue.map((t) => t.id), ['1'])
  assert.deepEqual(g.upcoming.map((t) => t.id), ['2', '3', '4'])
  assert.deepEqual(g.completed.map((t) => t.id), ['5'])
})

test('create/edit/done: signed out, no Clients access, and demo cannot write', async () => {
  reset(null); assert.equal((await post({ title: 'A' })).status, 401)
  reset(); G.access = false; assert.equal((await post({ title: 'A' })).status, 403)
  reset(); G.demo = true; assert.equal((await post({ title: 'A' })).status, 403)
  reset(); G.demo = true; assert.equal((await patch(ID1, { title: 'B' })).status, 403)
  reset(); G.demo = true; assert.equal((await done(ID1, { done: true })).status, 403)
  reset(); assert.equal((await post('title=A', 'application/x-www-form-urlencoded')).status, 415)
  assert.equal(G.inserts.length, 0)
  assert.equal(G.rows.find((r) => r.user_id === U2.id).title, 'Theirs')
})

test('create stores the session owner only and ignores a forged user_id', async () => {
  reset()
  const r = await post({ title: '  Follow up ', due_on: '2026-12-01', user_id: U2.id })
  assert.equal(r.status, 201)
  const row = G.inserts[0]
  assert.equal(row.user_id, U1.id)
  assert.equal(row.title, 'Follow up')
  assert.equal(row.due_on, '2026-12-01')
  assert.equal(row.done_at, null)
  assert.equal(G.rows.find((x) => x.user_id === U2.id).title, 'Theirs')
  assert.equal((await post({ title: '' })).status, 400)
  assert.equal((await post({ title: 'Ok', due_on: '2026-02-31' })).status, 400)
})

test('edit and done/reopen change only the owner row', async () => {
  reset()
  const forged = await patch(ID1, { title: 'Updated', due_on: '', user_id: U2.id })
  assert.equal(forged.status, 200)
  const mine = G.rows.find((r) => r.id === ID1)
  assert.equal(mine.title, 'Updated')
  assert.equal(mine.due_on, null)
  assert.equal(mine.user_id, U1.id)
  assert.equal(G.rows.find((r) => r.id === ID2).title, 'Theirs')
  const missing = await patch(ID2, { title: 'Steal' })
  assert.equal(missing.status, 404)
  assert.equal(G.rows.find((r) => r.id === ID2).title, 'Theirs')
  const marked = await done(ID1, { done: true, user_id: U2.id })
  assert.equal(marked.status, 200)
  assert.ok(G.rows.find((r) => r.id === ID1).done_at)
  assert.equal(G.rows.find((r) => r.id === ID2).done_at, null)
  const reopened = await done(ID1, { done: false })
  assert.equal(reopened.status, 200)
  assert.equal(G.rows.find((r) => r.id === ID1).done_at, null)
  assert.equal((await done(ID1, { done: 'yes' })).status, 400)
  assert.equal((await done(ID2, { done: true })).status, 404)
})

test('a read error is not an empty task list, and a 200-character title wraps', () => {
  const leaked = { message: 'password=supersecret relation crm_tasks', code: '42P01' }
  const failed = T.tasksFromQuery({ data: null, error: leaked })
  assert.deepEqual(failed, { ok: false })
  assert.equal(JSON.stringify(failed).includes('supersecret'), false)
  assert.equal(JSON.stringify(failed).includes('crm_tasks'), false)
  const ok = T.tasksFromQuery({ data: [{ id: '1', title: 'A', due_on: null, done_at: null }], error: null })
  assert.equal(ok.ok, true)
  assert.equal(ok.tasks.length, 1)
  const load = read('lib/crm/tasks-load.ts')
  assert.match(load, /tasksFromQuery/)
  assert.doesNotMatch(load, /if \(error\) return \[\]/)
  assert.doesNotMatch(load, /console\.error\([^)]*\berror\b/)
  const ui = read('components/crm/task-list.tsx')
  const page = read('app/crm/tasks/page.tsx')
  assert.match(ui, /data-task-load-error/)
  assert.match(ui, /type="button"[^>]*onClick=\{\(\) => window\.location\.reload\(\)\}[^>]*>Try again/)
  assert.doesNotMatch(ui, /useRouter|router\.refresh|href=["']\/crm\/tasks["']/)
  assert.match(ui, /data-task-title[\s\S]*overflow-wrap:anywhere/)
  assert.match(ui, /min-w-0 max-w-full break-words/)
  assert.match(page, /loadError=\{!loaded\.ok\}/)
  assert.doesNotMatch(read('supabase/migrations/20261105210037_crm_tasks.sql'), /loadError|overflow-wrap/)
})

test('SQL grants are narrow; this file check is not live RLS proof', () => {
  const sql = read('supabase/migrations/20261105210037_crm_tasks.sql')
  assert.match(sql, /create table if not exists public\.crm_tasks/)
  assert.match(sql, /enable row level security/)
  assert.match(sql, /user_id = auth\.uid\(\)/)
  assert.match(sql, /crm_has_access\(auth\.uid\(\)\)/)
  assert.match(sql, /revoke all on table public\.crm_tasks from public/)
  assert.match(sql, /revoke all on table public\.crm_tasks from anon/)
  assert.match(sql, /revoke all on table public\.crm_tasks from authenticated/)
  assert.match(sql, /grant select, insert, update on table public\.crm_tasks to authenticated/)
  assert.doesNotMatch(sql, /grant\s+(all|delete|truncate)\b/i)
  assert.doesNotMatch(sql, /\b(drop table|truncate|delete from)\b/i)
  assert.match(sql, /not live Postgres RLS proof/i)
  assert.match(read('app/api/crm/tasks/route.ts'), /user_id: g\.user\.id/)
  assert.doesNotMatch(read('app/api/crm/tasks/route.ts') + read('app/api/crm/tasks/[id]/route.ts') + read('app/api/crm/tasks/[id]/done/route.ts'), /service_role|SERVICE_ROLE|createAdminClient|pt_tasks|tt_entries/)
  assert.match(read('app/crm/layout.tsx'), /href="\/crm\/tasks"/)
  assert.match(read('tools/crm/tool.ts'), /href: '\/crm\/tasks'/)
  assert.doesNotMatch(read('lib/me/today.ts'), /crm_tasks/)
})
