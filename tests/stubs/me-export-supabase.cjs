// Session stand-in for /api/me/export. Filters rows the way owner RLS plus .eq(user_id) does.
const state = { user: null, calls: [], tasks: [] }
function from(table) {
  const f = {}
  const q = {
    select() { return q },
    eq(col, val) { f.col = col; f.val = val; return q },
    in() { return q },
    limit() {
      state.calls.push({ table, col: f.col || null, val: f.val })
      const rows = table === 'crm_tasks' ? state.tasks : []
      const data = f.col ? rows.filter((r) => r[f.col] === f.val) : rows
      return Promise.resolve({ data, error: null })
    },
  }
  return q
}
async function createServerClient() {
  return { auth: { getUser: async () => ({ data: { user: state.user } }) }, from }
}
module.exports = { createServerClient, __state: state }
