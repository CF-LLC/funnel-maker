import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { apGuard, bad } from '@/lib/approvals/guard'
import { ITEM_COLS, isUuid } from '@/lib/approvals/core'

/** New private link; the old one stops working immediately. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await apGuard(true); if (g.err) return g.err
  const { data } = await g.db.from('ap_items').update({ token: randomBytes(32).toString('hex'), revoked: false, updated_at: new Date().toISOString() }).eq('id', id).select(ITEM_COLS).maybeSingle()
  if (!data) return bad('Not found.', 404)
  return NextResponse.json({ item: data })
}
