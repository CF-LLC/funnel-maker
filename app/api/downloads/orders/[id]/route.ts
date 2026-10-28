import { NextResponse } from 'next/server'
import { dlGuard, bad, ORDER_COLS } from '@/lib/dlstore/guard'
import { isUuid } from '@/lib/dlstore/core'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await dlGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  const { data } = await g.db.from('dl_orders').update({ revoked: b?.revoked === true }).eq('id', id).select(ORDER_COLS).maybeSingle()
  if (!data) return bad('Not found.', 404)
  return NextResponse.json({ order: data })
}
