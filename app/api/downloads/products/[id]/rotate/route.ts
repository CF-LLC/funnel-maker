import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { dlGuard, bad, PRODUCT_COLS, toProduct } from '@/lib/dlstore/guard'
import { isUuid } from '@/lib/dlstore/core'

/** New redirect key: old thanks links stop working (already-claimed order links keep working). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await dlGuard(true); if (g.err) return g.err
  const { data } = await g.db.from('dl_products').update({ redirect_key: randomUUID(), updated_at: new Date().toISOString() }).eq('id', id).select(PRODUCT_COLS).maybeSingle()
  if (!data) return bad('Not found.', 404)
  return NextResponse.json({ product: toProduct(data) })
}
