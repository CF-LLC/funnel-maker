// Test stub for lib/crm/guard: an in-memory crm_contacts table with owner-only filtering.
const state = { user: null, access: true, demo: false, rows: [], inserts: [], updates: [], upserts: [] }
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
function owned(row) { return state.user && row.user_id === state.user.id }
function db() {
  return { from(t) {
    if (t !== 'crm_contacts') throw new Error('unexpected table ' + t)
    const f = {}
    const q = {
      select() { return q },
      eq(k, v) { f[k] = v; return q },
      async maybeSingle() {
        if (f.user_id && !owned({ user_id: f.user_id })) return { data: null, error: { code: '42501' } }
        return { data: state.rows.find((r) => r.user_id === f.user_id && r.email === f.email) || null, error: null }
      },
      async single() { return q.maybeSingle() },
      async insert(row) {
        state.inserts.push(row)
        if (!owned(row)) return { error: { code: '42501' } }
        if (state.rows.some((r) => r.user_id === row.user_id && r.email === row.email)) return { error: { code: '23505' } }
        state.rows.push({ ...row })
        return { error: null }
      },
      update(patch) {
        const u = {}
        const uq = {
          eq(k, v) { u[k] = v; return uq },
          select() { return uq },
          async maybeSingle() {
            state.updates.push({ patch, filter: { ...u } })
            if (!state.user || u.user_id !== state.user.id) return { data: null, error: { code: '42501' } }
            const i = state.rows.findIndex((r) => r.user_id === u.user_id && r.email === u.email)
            if (i < 0) return { data: null, error: null }
            state.rows[i] = { ...state.rows[i], ...patch }
            return { data: { email: state.rows[i].email, archived_at: state.rows[i].archived_at ?? null }, error: null }
          },
        }
        return uq
      },
      upsert(row) {
        state.upserts.push(row)
        const done = () => {
          if (!owned(row)) return { data: null, error: { code: '42501' } }
          const i = state.rows.findIndex((r) => r.user_id === row.user_id && r.email === row.email)
          if (i >= 0) state.rows[i] = { ...state.rows[i], ...row }
          else state.rows.push({ ...row })
          const saved = i >= 0 ? state.rows[i] : state.rows[state.rows.length - 1]
          return { data: saved, error: null }
        }
        return { select() { return { single: async () => done() } } }
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
module.exports = { crmGuard, bad, DEMO_MSG: 'demo', __state: state, openDb: db }
