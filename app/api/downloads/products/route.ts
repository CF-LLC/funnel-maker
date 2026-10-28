import { NextResponse } from 'next/server'
import { dlGuard, bad, PRODUCT_COLS, toProduct } from '@/lib/dlstore/guard'
import { KINDS, MAX_PRODUCTS, clip, slugify, validProductSlug } from '@/lib/dlstore/core'

export async function POST(req: Request) {
  const g = await dlGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  const title = clip(b?.title, 120); if (!title) return bad('Give your product a name.')
  const { count } = await g.db.from('dl_products').select('id', { count: 'exact', head: true })
  if ((count || 0) >= MAX_PRODUCTS) return bad(`You can have up to ${MAX_PRODUCTS} products.`)
  let slug = slugify(title); if (!validProductSlug(slug)) slug = `product-${Date.now().toString(36)}`
  const kind = b?.kind in KINDS ? b.kind : 'pdf'
  for (let i = 0; i < 5; i++) {
    const { data, error } = await g.db.from('dl_products').insert({ user_id: g.user.id, slug: i ? `${slug.slice(0, 54)}-${i + 1}` : slug, title, kind }).select(PRODUCT_COLS).single()
    if (!error) return NextResponse.json({ product: toProduct(data) })
    if (error.code !== '23505') return bad('Could not create the product.')
  }
  return bad('Could not create the product.')
}
