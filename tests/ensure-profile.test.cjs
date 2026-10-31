// Signup/login profile safety net. Run with: node --test tests/ensure-profile.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')

function fakeAdmin(rows) {
  const calls = []
  return {
    calls,
    from() {
      return {
        select() { return { eq(_c, id) { return { maybeSingle: async () => ({ data: rows.find((r) => r.id === id) || null, error: null }) } } } },
        upsert: async (row, opts) => { calls.push([row, opts]); if (!rows.find((r) => r.id === row.id)) rows.push(row); return { error: null } },
      }
    },
  }
}

test('profileRowFor mirrors the DB trigger defaults', () => {
  const { profileRowFor } = jiti('../lib/server/ensure-profile.ts')
  assert.deepEqual(profileRowFor({ id: 'u', email: 'a@b.co', user_metadata: { template: 'free-download', wish_tool: '  x ' } }),
    { id: 'u', email: 'a@b.co', signup_template: 'free-download', wish_tool: 'x' })
  assert.equal(profileRowFor({ id: 'u', email: 'a@b.co', user_metadata: { template: 'evil' } }).signup_template, null)
  assert.equal(profileRowFor({ id: 'u', email: 'a@b.co', user_metadata: { wish_tool: 'y'.repeat(900) } }).wish_tool.length, 500)
})

test('ensureProfile creates a missing row once and never overwrites', async () => {
  const { ensureProfile } = jiti('../lib/server/ensure-profile.ts')
  const rows = []
  const admin = fakeAdmin(rows)
  assert.deepEqual(await ensureProfile(admin, { id: 'u1', email: 'a@b.co' }), { created: true })
  assert.deepEqual(await ensureProfile(admin, { id: 'u1', email: 'a@b.co' }), { created: false })
  assert.equal(rows.length, 1)
  assert.equal(admin.calls.length, 1)
  assert.equal(admin.calls[0][1].ignoreDuplicates, true)
  assert.equal((await ensureProfile(admin, { id: 'u2' })).created, false)
})

test('register page no longer writes tables from the client and handles no-session signups', () => {
  const s = read('app/auth/register/page.tsx')
  assert.ok(!s.includes(".from('users')"))
  assert.ok(!s.includes(".from('subscriptions')"))
  assert.ok(s.includes('!data.session'))
  assert.ok(!s.includes('issue setting up your profile'))
})

test('login and auth callback use the server-side ensure-profile fallback', () => {
  assert.ok(read('app/auth/login/page.tsx').includes('/api/auth/ensure-profile'))
  assert.ok(!read('app/auth/login/page.tsx').includes(".from('users')"))
  assert.ok(read('app/auth/callback/route.ts').includes('ensureProfile('))
  const r = read('app/api/auth/ensure-profile/route.ts')
  assert.ok(r.includes('getUser()') && r.includes('serviceClient()'))
})
