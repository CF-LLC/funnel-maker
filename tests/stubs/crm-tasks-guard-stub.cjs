// In-memory crm_tasks for route tests. Not a Postgres RLS implementation.
const state = { user: null, access: true, demo: false, rows: [], inserts: [], updates: [] }
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
function db() {
  return { from(t) {
    if (t !== 'crm_tasks') throw new Error('unexpected table ' + t)
    return {
      insert(row) {
        state.inserts.push(row)
        const finish = () => {
          if (!state.user || row.user_id !== state.user.id) return { data: null, error: { code: '42501' } }
          const saved = { ...row, id: row.id || 'cccccccc-cccc-cccc-cccc-cccccccccccc' }
          state.rows.push(saved)
          return { data: saved, error: null }
        }
        return { select() { return { single: async () => finish() } } }
      },
      update(patch) {
        const f = {}
        const q = {
          eq(k, v) { f[k] = v; return q },
          select() { return q },
          async maybeSingle() {
            state.updates.push({ patch, filter: { ...f } })
            if (!state.user || f.user_id !== state.user.id) return { data: null, error: { code: '42501' } }
            const i = state.rows.findIndex((r) => r.user_id === f.user_id && r.id === f.id)
            if (i < 0) return { data: null, error: null }
            state.rows[i] = { ...state.rows[i], ...patch }
            return { data: state.rows[i], error: null }
          },
        }
        return q
      },
    }
  } }
}
async function crmGuard(write) {
  if (!state.user) return { err: json({ error: 'Please sign in again.' }, 401) }
  if (!state.demo && !state.access) return { err: json({ error: 'Clients is not on your plan yet.' }, 403) }
  if (write && state.demo) return { err: json({ error: 'demo', demo: true }, 403) }
  return { db: db(), user: state.user, demo: state.demo }
}
module.exports = { crmGuard, bad: (error, status = 400) => json({ error }, status), DEMO_MSG: 'demo', __state: state }
