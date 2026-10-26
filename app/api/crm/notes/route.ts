import { NextResponse } from 'next/server'
import { z } from 'zod'
import { crmGuard, bad } from '@/lib/crm/guard'
import { normEmail } from '@/lib/crm/core'

const body = z.string().trim().min(1, 'Write something first.').max(5000, 'Notes can be up to 5,000 characters.')
const uuid = z.string().uuid()
async function json(req: Request) { try { return await req.json() } catch { return null } }

export async function POST(req: Request) {
  const g = await crmGuard(true); if (g.err) return g.err
  const j = await json(req); const email = normEmail(j?.email); const b = body.safeParse(j?.body)
  if (!email) return bad('That email address looks invalid.')
  if (!b.success) return bad(b.error.issues[0].message)
  const { data, error } = await g.db.from('crm_notes').insert({ user_id: g.user.id, email, body: b.data }).select('id, body, created_at, updated_at').single()
  if (error) return bad('Could not save the note.', 500)
  return NextResponse.json({ note: data })
}
export async function PATCH(req: Request) {
  const g = await crmGuard(true); if (g.err) return g.err
  const j = await json(req); const id = uuid.safeParse(j?.id); const b = body.safeParse(j?.body)
  if (!id.success) return bad('Note not found.', 404)
  if (!b.success) return bad(b.error.issues[0].message)
  const { data, error } = await g.db.from('crm_notes').update({ body: b.data, updated_at: new Date().toISOString() }).eq('id', id.data).eq('user_id', g.user.id).select('id, body, created_at, updated_at').maybeSingle()
  if (error) return bad('Could not save the note.', 500)
  if (!data) return bad('Note not found.', 404)
  return NextResponse.json({ note: data })
}
export async function DELETE(req: Request) {
  const g = await crmGuard(true); if (g.err) return g.err
  const id = uuid.safeParse(new URL(req.url).searchParams.get('id'))
  if (!id.success) return bad('Note not found.', 404)
  const { error } = await g.db.from('crm_notes').delete().eq('id', id.data).eq('user_id', g.user.id)
  if (error) return bad('Could not delete the note.', 500)
  return NextResponse.json({ ok: true })
}
