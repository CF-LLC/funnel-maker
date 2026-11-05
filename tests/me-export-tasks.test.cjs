// Download-my-data includes the owner's private tasks. Session client only; not live Postgres.
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@/lib/supabase': path.join(__dirname, 'stubs/me-export-supabase.cjs'), '@': root } })
const route = jiti('../app/api/me/export/route.ts')
const { EXPORT_TABLES } = jiti('../lib/me/results.ts')
const stub = require('./stubs/me-export-supabase.cjs')

const U1 = '11111111-1111-1111-1111-111111111111'
const U2 = '22222222-2222-2222-2222-222222222222'

test('export list includes crm_tasks because Download my data is every owner table', () => {
  assert.ok(EXPORT_TABLES.some((t) => t.table === 'crm_tasks' && t.col === 'user_id'))
})

test('signed out is 401 and does not read tasks', async () => {
  stub.__state.user = null
  stub.__state.calls = []
  const res = await route.GET()
  assert.equal(res.status, 401)
  assert.equal(stub.__state.calls.some((c) => c.table === 'crm_tasks'), false)
})

test('owner export returns only that owner\'s tasks', async () => {
  stub.__state.user = { id: U1, email: 'owner@example.com', created_at: '2026-01-01T00:00:00Z' }
  stub.__state.calls = []
  stub.__state.tasks = [
    ...[1, 2, 3, 4, 5].map((i) => ({ id: `t${i}`, user_id: U1, title: `mine ${i}` })),
    { id: 'secret', user_id: U2, title: 'other owner' },
  ]
  const res = await route.GET()
  assert.equal(res.status, 200)
  const body = JSON.parse(await res.text())
  assert.equal(body.crm_tasks.length, 5)
  assert.ok(body.crm_tasks.every((t) => t.user_id === U1))
  assert.equal(JSON.stringify(body.crm_tasks).includes('other owner'), false)
  assert.ok(stub.__state.calls.some((c) => c.table === 'crm_tasks' && c.col === 'user_id' && c.val === U1))
})
