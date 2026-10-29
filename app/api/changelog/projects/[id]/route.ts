import { NextResponse } from 'next/server'
import { clGuard, bad } from '@/lib/changelog/guard'
import { PROJECT_COLS, cleanProject, isUuid } from '@/lib/changelog/core'

/** Edit project details, or revoke/restore the link. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await clGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  const up: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof b?.revoked === 'boolean') up.revoked = b.revoked
  if (typeof b?.title === 'string') { const c = cleanProject(b); if (!c.ok) return bad(c.error); Object.assign(up, c.p) }
  const { data, error } = await g.db.from('cl_projects').update(up).eq('id', id).select(PROJECT_COLS).maybeSingle()
  if (error || !data) return bad('Could not save.')
  return NextResponse.json({ project: data })
}
/** Delete the project and its requests. Invoices already made from it are untouched. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await clGuard(true); if (g.err) return g.err
  const { data } = await g.db.from('cl_projects').delete().eq('id', id).select('id')
  if (!data?.length) return bad('Not found.', 404)
  return NextResponse.json({ ok: true })
}
