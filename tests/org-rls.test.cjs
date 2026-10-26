// Org RLS: no "infinite recursion" on organizations/org_members, and org creation works end to end.
// Live check against the real DB with throwaway users; runs only with ORG_RLS_LIVE=1 and the
// nosvgroktxgesolphhyn project env. Everything created is deleted afterwards.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const root = path.resolve(__dirname, '..')

test('migration replaces recursive policies with security definer helpers', () => {
  const sql = fs.readFileSync(path.join(root, 'supabase/migrations/20261025e_org_rls_recursion.sql'), 'utf8')
  assert.match(sql, /function public\.is_org_member[\s\S]*security definer set search_path = public/)
  assert.match(sql, /function public\.is_org_admin[\s\S]*security definer set search_path = public/)
  const policies = sql.split(/create policy/i).slice(1)
  assert.ok(policies.length >= 7)
  for (const p of policies) assert.doesNotMatch(p.split(';')[0], /from public\.(organizations|org_members)/)
  assert.doesNotMatch(sql, /\b(delete from|truncate|drop table)\b/i)
})

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const live = process.env.ORG_RLS_LIVE === '1' && URL_.includes('nosvgroktxgesolphhyn') && process.env.SUPABASE_SECRET_KEY
test('live: create org, owner member, select/insert/update/delete without recursion', { skip: !live && 'set ORG_RLS_LIVE=1' }, async () => {
  const { createClient } = require('@supabase/supabase-js')
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY
  const admin = createClient(URL_, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
  const mk = async (tag) => {
    const email = `zz-rls-${tag}-${crypto.randomUUID().slice(0, 8)}@example.invalid`, password = crypto.randomBytes(18).toString('base64url')
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error) throw error
    await admin.from('users').upsert({ id: data.user.id, email }, { onConflict: 'id', ignoreDuplicates: true })
    const c = createClient(URL_, anonKey, { auth: { persistSession: false } })
    const s = await c.auth.signInWithPassword({ email, password }); if (s.error) throw s.error
    return { id: data.user.id, c }
  }
  const users = []
  try {
    const owner = await mk('owner'); users.push(owner.id)
    const other = await mk('member'); users.push(other.id)
    const noRec = (r) => { assert.ok(!r.error || !/recursion/i.test(r.error.message), r.error && r.error.message); return r }

    const org = noRec(await owner.c.from('organizations').insert({ name: 'zz-rls-test', owner_id: owner.id }).select().single())
    assert.ifError(org.error); const orgId = org.data.id
    assert.ifError(noRec(await owner.c.from('org_members').insert({ org_id: orgId, user_id: owner.id, role: 'owner' }).select().single()).error)
    assert.equal(noRec(await owner.c.from('organizations').select('*, org_members(role)').eq('id', orgId)).data.length, 1)
    assert.ifError(noRec(await owner.c.from('organizations').update({ name: 'zz-rls-test-2' }).eq('id', orgId)).error)
    assert.ifError(noRec(await owner.c.from('org_members').insert({ org_id: orgId, user_id: other.id, role: 'member' })).error)
    assert.ifError(noRec(await owner.c.from('org_members').update({ role: 'admin' }).eq('org_id', orgId).eq('user_id', other.id)).error)
    // member sees the org and fellow members, but cannot see orgs it is not in
    assert.equal(noRec(await other.c.from('organizations').select('id').eq('id', orgId)).data.length, 1)
    assert.equal(noRec(await other.c.from('org_members').select('id').eq('org_id', orgId)).data.length, 2)
    assert.ifError(noRec(await owner.c.from('invitations').select('id').eq('org_id', orgId)).error)
    assert.ifError(noRec(await owner.c.from('org_members').delete().eq('org_id', orgId).eq('user_id', other.id)).error)
    assert.equal(noRec(await other.c.from('organizations').select('id').eq('id', orgId)).data.length, 0)
    // outsider cannot add themselves
    assert.ok(noRec(await other.c.from('org_members').insert({ org_id: orgId, user_id: other.id, role: 'owner' })).error)
    assert.ifError(noRec(await owner.c.from('organizations').delete().eq('id', orgId)).error)
    assert.equal((await admin.from('organizations').select('id').eq('id', orgId)).data.length, 0)
  } finally {
    for (const id of users) { await admin.from('organizations').delete().eq('owner_id', id); await admin.auth.admin.deleteUser(id) }
    if (users.length) await admin.from('users').delete().in('id', users)
  }
})
