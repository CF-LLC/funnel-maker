import { NextResponse } from 'next/server'
import { exGuard, bad, dbErr } from '@/lib/expenses/guard'
import { DEFAULT_CATEGORIES, EXPENSE_COLS, isDate, parseExpense } from '@/lib/expenses/core'
import { loadProjects } from '@/lib/expenses/server'
import { DEMO_CATEGORIES, DEMO_CRM, DEMO_PROJECTS, demoExpenses } from '@/lib/expenses/demo'

export const dynamic = 'force-dynamic'
/** Everything the page needs: categories (seeded with defaults the first time), expenses since `from` (default ~13 months), Time projects, CRM contacts. */
export async function GET(req: Request) {
  const g = await exGuard(false); if (g.err) return g.err
  const from = new URL(req.url).searchParams.get('from') || ''
  if (from && !isDate(from)) return bad('Bad date.')
  if (g.demo) return NextResponse.json({ demo: true, categories: DEMO_CATEGORIES, expenses: demoExpenses(), projects: DEMO_PROJECTS, crm: DEMO_CRM })
  let { data: cats } = await g.db.from('ex_categories').select('id, name, archived').order('name')
  if (!cats?.length) {
    await g.db.from('ex_categories').insert(DEFAULT_CATEGORIES.map((name) => ({ user_id: g.user.id, name })))
    cats = (await g.db.from('ex_categories').select('id, name, archived').order('name')).data || []
  }
  const since = from || new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10)
  const [e, projects, crm] = await Promise.all([
    g.db.from('ex_expenses').select(EXPENSE_COLS).gte('expense_date', since).order('expense_date', { ascending: false }).order('created_at', { ascending: false }).limit(5000),
    loadProjects(g.db),
    g.db.from('crm_contacts').select('email, name, company').order('name').limit(500),
  ])
  if (e.error) return bad('Could not load your expenses.', 500)
  return NextResponse.json({ demo: false, categories: cats, expenses: e.data || [], projects, crm: crm.data || [] })
}
export async function POST(req: Request) {
  const g = await exGuard(true); if (g.err) return g.err
  const p = parseExpense(await req.json().catch(() => null))
  if ('error' in p) return bad(p.error)
  const { data, error } = await g.db.from('ex_expenses').insert({ ...p.row, user_id: g.user.id }).select(EXPENSE_COLS).single()
  if (error) return dbErr(error, 'Could not save the expense.')
  return NextResponse.json({ expense: data })
}
