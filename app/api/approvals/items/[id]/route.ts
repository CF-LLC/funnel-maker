import { NextResponse } from 'next/server'
import { apGuard, bad } from '@/lib/approvals/guard'
import { BUCKET, ITEM_COLS, cleanItem, isUuid } from '@/lib/approvals/core'

/** Edit item details, or revoke/restore the link. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await apGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  const up: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof b?.revoked === 'boolean') up.revoked = b.revoked
  if (typeof b?.title === 'string') { const c = cleanItem(b); if (!c.ok) return bad(c.error); Object.assign(up, c.i) }
  const { data, error } = await g.db.from('ap_items').update(up).eq('id', id).select(ITEM_COLS).maybeSingle()
  if (error || !data) return bad('Could not save.')
  return NextResponse.json({ item: data })
}
/** Delete the item, its versions, comments and stored files. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await apGuard(true); if (g.err) return g.err
  const { data: files } = await g.db.from('ap_versions').select('path').eq('item_id', id).eq('kind', 'file')
  const { data } = await g.db.from('ap_items').delete().eq('id', id).select('id')
  if (!data?.length) return bad('Not found.', 404)
  const paths = (files || []).map((f: any) => f.path).filter(Boolean)
  if (paths.length) await g.db.storage.from(BUCKET).remove(paths)
  return NextResponse.json({ ok: true })
}
