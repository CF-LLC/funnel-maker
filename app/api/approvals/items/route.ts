import { NextResponse } from 'next/server'
import { apGuard, bad } from '@/lib/approvals/guard'
import { ITEM_COLS, MAX_ITEMS, cleanItem } from '@/lib/approvals/core'

/** New approval item (one private client link each). */
export async function POST(req: Request) {
  const g = await apGuard(true); if (g.err) return g.err
  const c = cleanItem(await req.json().catch(() => null))
  if (!c.ok) return bad(c.error)
  const { count } = await g.db.from('ap_items').select('id', { count: 'exact', head: true })
  if ((count || 0) >= MAX_ITEMS) return bad(`Up to ${MAX_ITEMS} items.`)
  const { data, error } = await g.db.from('ap_items').insert({ user_id: g.user.id, ...c.i }).select(ITEM_COLS).single()
  if (error || !data) return bad('Could not create the item.')
  return NextResponse.json({ item: data })
}
