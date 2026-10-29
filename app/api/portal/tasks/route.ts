import { NextResponse } from 'next/server'
import { ptGuard, bad } from '@/lib/portal/guard'
import { MAX_TASKS, TASK_COLS, cleanTask, isUuid } from '@/lib/portal/core'

export async function POST(req: Request) {
  const g = await ptGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  if (!isUuid(b?.portal_id)) return bad('Bad request.')
  const c = cleanTask(b); if (!c.ok) return bad(c.error)
  const { count } = await g.db.from('pt_tasks').select('id', { count: 'exact', head: true }).eq('portal_id', b.portal_id)
  if ((count || 0) >= MAX_TASKS) return bad(`Up to ${MAX_TASKS} steps per portal.`)
  const { data, error } = await g.db.from('pt_tasks').insert({ user_id: g.user.id, portal_id: b.portal_id, ...c.task, sort: count || 0 }).select(TASK_COLS).single()
  if (error) return bad('Could not add the step.')
  return NextResponse.json({ task: data })
}
/** Owner can tick/untick any step (client or owner). */
export async function PATCH(req: Request) {
  const g = await ptGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  if (!isUuid(b?.id) || typeof b?.done !== 'boolean') return bad('Bad request.')
  const { data } = await g.db.from('pt_tasks').update(b.done ? { done_at: new Date().toISOString(), done_by: 'owner' } : { done_at: null, done_by: null }).eq('id', b.id).select(TASK_COLS).maybeSingle()
  if (!data) return bad('Not found.', 404)
  return NextResponse.json({ task: data })
}
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get('id'); if (!isUuid(id)) return bad('Not found.', 404)
  const g = await ptGuard(true); if (g.err) return g.err
  await g.db.from('pt_tasks').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
