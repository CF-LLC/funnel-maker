import { exGuard, bad } from '@/lib/expenses/guard'
import { EXPENSE_COLS, isDate, toCsv } from '@/lib/expenses/core'
import { DEMO_CATEGORIES, DEMO_CRM, DEMO_PROJECTS, demoExpenses } from '@/lib/expenses/demo'
import { loadProjects } from '@/lib/expenses/server'

export const dynamic = 'force-dynamic'
/** CSV of expenses between from..to (inclusive). */
export async function GET(req: Request) {
  const g = await exGuard(false); if (g.err) return g.err
  const u = new URL(req.url)
  const from = u.searchParams.get('from'), to = u.searchParams.get('to')
  if (!isDate(from) || !isDate(to) || from > to) return bad('Pick a date range.')
  let csv: string
  if (g.demo) csv = toCsv(demoExpenses().filter((e) => e.expense_date >= from && e.expense_date <= to), DEMO_CATEGORIES, DEMO_PROJECTS, DEMO_CRM)
  else {
    const [c, e, p, crm] = await Promise.all([
      g.db.from('ex_categories').select('id, name, archived'),
      g.db.from('ex_expenses').select(EXPENSE_COLS).gte('expense_date', from).lte('expense_date', to).limit(20000),
      loadProjects(g.db),
      g.db.from('crm_contacts').select('email, name, company').limit(5000),
    ])
    if (e.error) return bad('Could not export.', 500)
    csv = toCsv(e.data || [], c.data || [], p, crm.data || [])
  }
  return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="expenses-${from}-to-${to}.csv"`, 'cache-control': 'no-store' } })
}
