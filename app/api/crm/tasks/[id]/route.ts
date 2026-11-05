import { NextResponse } from 'next/server'
import { crmGuard, bad } from '@/lib/crm/guard'
import { cleanDue, cleanTitle } from '@/lib/crm/tasks'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const COLS = 'id, title, due_on, done_at, created_at, updated_at'

/** Edit title and/or due date on a task the signed-in user owns. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(req.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) return bad('Invalid request.', 415)
  const g = await crmGuard(true); if (g.err) return g.err
  const { id } = await ctx.params
  if (!UUID.test(id)) return bad('Task not found.', 404)
  let body: unknown
  try { body = await req.json() } catch { return bad('Invalid request.') }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return bad('Invalid request.')
  const b = body as Record<string, unknown>
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (b.title !== undefined) {
    const title = cleanTitle(b.title)
    if (!title.ok) return bad(title.error)
    patch.title = title.title
  }
  if (b.due_on !== undefined) {
    const due = cleanDue(b.due_on)
    if (!due.ok) return bad(due.error)
    patch.due_on = due.due
  }
  if (patch.title === undefined && patch.due_on === undefined) return bad('Nothing to change.')
  const { data, error } = await g.db.from('crm_tasks').update(patch).eq('user_id', g.user.id).eq('id', id).select(COLS).maybeSingle()
  if (error) return bad(error.code === '42501' ? 'You cannot change that task.' : 'Could not save the task.', error.code === '42501' ? 403 : 500)
  if (!data) return bad('Task not found.', 404)
  return NextResponse.json({ task: data })
}
