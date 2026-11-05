import { NextResponse } from 'next/server'
import { crmGuard, bad } from '@/lib/crm/guard'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const COLS = 'id, title, due_on, done_at, created_at, updated_at'

/** Mark a task done or reopen it. Does not delete the row. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(req.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) return bad('Invalid request.', 415)
  const g = await crmGuard(true); if (g.err) return g.err
  const { id } = await ctx.params
  if (!UUID.test(id)) return bad('Task not found.', 404)
  let body: unknown
  try { body = await req.json() } catch { return bad('Invalid request.') }
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof (body as { done?: unknown }).done !== 'boolean') return bad('Say whether the task is done.')
  const done = (body as { done: boolean }).done
  const now = new Date().toISOString()
  const { data, error } = await g.db.from('crm_tasks').update({ done_at: done ? now : null, updated_at: now }).eq('user_id', g.user.id).eq('id', id).select(COLS).maybeSingle()
  if (error) return bad(error.code === '42501' ? 'You cannot change that task.' : 'Could not save the task.', error.code === '42501' ? 403 : 500)
  if (!data) return bad('Task not found.', 404)
  return NextResponse.json({ task: data })
}
