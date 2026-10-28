import { NextResponse } from 'next/server'
import { dlGuard, bad, PRODUCT_COLS, toProduct } from '@/lib/dlstore/guard'
import { BUCKET, KINDS, clip, isUuid, normCode, validCode, validPaymentLink, validProductSlug } from '@/lib/dlstore/core'
import { hashCode } from '@/lib/dlstore/hash'

type Ctx = { params: Promise<{ id: string }> }
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await dlGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null); if (!b) return bad('Bad request.')
  const slug = clip(b.slug, 60).toLowerCase()
  if (!validProductSlug(slug)) return bad('Product address: 3–60 lowercase letters, numbers or dashes.')
  const title = clip(b.title, 120); if (!title) return bad('Give your product a name.')
  const link = b.payment_link ? validPaymentLink(b.payment_link) : null
  if (b.payment_link && !link) return bad('Paste your Stripe Payment Link (it starts with https://buy.stripe.com/).')
  if (b.published && !link) return bad('Add your Stripe Payment Link before publishing.')
  const upd: Record<string, unknown> = {
    slug, title, subtitle: clip(b.subtitle, 200) || null, description: clip(b.description, 5000) || null, kind: b.kind in KINDS ? b.kind : 'pdf',
    price_label: clip(b.price_label, 40) || null, payment_link: link, published: b.published === true,
    max_downloads: Math.min(50, Math.max(1, Math.round(Number(b.max_downloads) || 5))), link_days: Math.min(90, Math.max(1, Math.round(Number(b.link_days) || 7))),
    sort: Math.min(1000, Math.max(0, Math.round(Number(b.sort) || 0))), updated_at: new Date().toISOString(),
  }
  if (b.access_code === '') upd.access_code_hash = null
  else if (typeof b.access_code === 'string') { const c = normCode(b.access_code); if (!validCode(c)) return bad('Access code: 4–40 letters, numbers or dashes.'); upd.access_code_hash = hashCode(c) }
  if (b.published) { const { count } = await g.db.from('dl_files').select('id', { count: 'exact', head: true }).eq('product_id', id); if (!count) return bad('Upload at least one file before publishing.') }
  const { data, error } = await g.db.from('dl_products').update(upd).eq('id', id).select(PRODUCT_COLS).maybeSingle()
  if (error) return bad(error.code === '23505' ? 'You already have a product at that address.' : 'Could not save.', error.code === '23505' ? 409 : 400)
  if (!data) return bad('Not found.', 404)
  return NextResponse.json({ product: toProduct(data) })
}
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await dlGuard(true); if (g.err) return g.err
  const { data: files } = await g.db.from('dl_files').select('path').eq('product_id', id)
  if (files?.length) await g.db.storage.from(BUCKET).remove(files.map((f: { path: string }) => f.path))
  const { error } = await g.db.from('dl_products').delete().eq('id', id)
  if (error) return bad('Could not delete.')
  return NextResponse.json({ ok: true })
}
