import { NextResponse } from 'next/server'
import { crmGuard, bad } from '@/lib/crm/guard'
import { cleanDue, cleanTitle } from '@/lib/crm/tasks'

const COLS = 'id, title, due_on, done_at, created_at, updated_at'

/** Create one private task for the signed-in user. user_id comes from the session only. */
export async function POST(req: Request) {
  if (!(req.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) return bad('Invalid request.', 415)
  const g = await crmGuard(true); if (g.err) return g.err
  let body: unknown
  try { body = await req.json() } catch { return bad('Invalid request.') }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return bad('Invalid request.')
  const b = body as Record<string, unknown>
  const title = cleanTitle(b.title)
  if (!title.ok) return bad(title.error)
  const due = cleanDue(b.due_on)
  if (!due.ok) return bad(due.error)
  const now = new Date().toISOString()
  const { data, error } = await g.db.from('crm_tasks').insert({ user_id: g.user.id, title: title.title, due_on: due.due, done_at: null, created_at: now, updated_at: now }).select(COLS).single()
  if (error) return bad(error.code === '42501' ? 'You cannot add that task.' : 'Could not save the task.', error.code === '42501' ? 403 : 500)
  return NextResponse.json({ task: data }, { status: 201 })
}
