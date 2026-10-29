import { NextResponse } from 'next/server'
import { apGuard, bad } from '@/lib/approvals/guard'
import { COMMENT_COLS, MAX_COMMENTS, cleanComment, isUuid } from '@/lib/approvals/core'

/** Owner reply on a version (RLS + trigger check the version belongs to the item and to you). */
export async function POST(req: Request) {
  const g = await apGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  if (!isUuid(b?.item_id) || !isUuid(b?.version_id)) return bad('Not found.', 404)
  const c = cleanComment(b); if (!c.ok) return bad(c.error)
  const { count } = await g.db.from('ap_comments').select('id', { count: 'exact', head: true }).eq('item_id', b.item_id)
  if ((count || 0) >= MAX_COMMENTS) return bad(`Up to ${MAX_COMMENTS} comments per item.`)
  const { data, error } = await g.db.from('ap_comments').insert({ user_id: g.user.id, item_id: b.item_id, version_id: b.version_id, body: c.body }).select(COMMENT_COLS).single()
  if (error || !data) return bad('Could not post the comment.')
  return NextResponse.json({ comment: data })
}
