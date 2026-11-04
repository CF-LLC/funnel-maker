// Test stub for lib/crm/guard: an in-memory crm_contacts table with owner-only filtering.
const state = { user: null, access: true, demo: false, rows: [], inserts: [] }
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
function db() {
  return { from(t) {
    if (t !== 'crm_contacts') throw new Error('unexpected table ' + t)
    const f = {}
    const q = {
      select() { return q }, eq(k, v) { f[k] = v; return q },
      async maybeSingle() { return { data: state.rows.find((r) => r.user_id === f.user_id && r.email === f.email) || null, error: null } },
      async insert(row) {
        state.inserts.push(row)
        if (row.user_id !== state.user.id) return { error: { code: '42501' } }
        if (state.rows.some((r) => r.user_id === row.user_id && r.email === row.email)) return { error: { code: '23505' } }
        state.rows.push({ ...row }); return { error: null }
      },
    }
    return q
  } }
}
async function crmGuard(write) {
  if (!state.user) return { err: json({ error: 'Please sign in again.' }, 401) }
  if (!state.demo && !state.access) return { err: json({ error: 'Clients is not on your plan yet.' }, 403) }
  if (write && state.demo) return { err: json({ error: 'demo', demo: true }, 403) }
  return { db: db(), user: state.user, demo: state.demo }
}
const bad = (error, status = 400) => json({ error }, status)
module.exports = { crmGuard, bad, DEMO_MSG: 'demo', __state: state }
