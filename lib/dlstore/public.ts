// Public (no sign-in) store operations. Service role, narrow inputs; routes rate-limit. Buyers never get table or bucket access.
import { serviceClient } from '@/lib/server/admin-client'
import { isDemoUser } from '@/lib/demo'
import { BUCKET, DEMO_STORE_SLUG, SIGNED_TTL_SECONDS, claimCheck, downloadPageUrl, isUuid, orderExpiry, orderState, renderDelivery, validProductSlug, type DlFile, type Product, type Store } from './core'
import { demoFiles, demoProducts, demoStore } from './demo'
import { FILE_COLS, PRODUCT_COLS, STORE_COLS, toProduct } from './guard'
import { hashCode } from './hash'
import { deliveryFrom, deliveryGate, sendDelivery } from './send'

export type PublicStore = Store & { userId: string; demo: boolean }
export type PublicProduct = Omit<Product, 'redirect_key' | 'has_code'>
const strip = ({ redirect_key, has_code, ...p }: Product): PublicProduct => p

/** A store exists only if the seller set a slug and currently has Digital downloads (or All Access). */
export async function findStore(slug: string): Promise<PublicStore | null> {
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return null
  if (slug === DEMO_STORE_SLUG) return { ...demoStore(), userId: 'demo', demo: true }
  const db: any = serviceClient()
  const { data: s } = await db.from('dl_stores').select(`user_id,${STORE_COLS}`).eq('slug', slug).maybeSingle()
  if (!s) return null
  const demo = isDemoUser(s.user_id)
  const { data: ok } = await db.rpc('dl_has_access', { uid: s.user_id })
  if (ok !== true && !demo) return null
  const { user_id, ...store } = s
  return { ...store, userId: user_id, demo }
}
export async function storeProducts(st: PublicStore): Promise<PublicProduct[]> {
  if (st.userId === 'demo') return demoProducts().filter((p) => p.published).map(strip)
  const db: any = serviceClient()
  const { data } = await db.from('dl_products').select(PRODUCT_COLS).eq('user_id', st.userId).eq('published', true).order('sort').order('created_at', { ascending: false }).limit(60)
  return (data || []).map((r: any) => strip(toProduct(r)))
}
async function productRow(st: PublicStore, slug: string): Promise<any | null> {
  if (!validProductSlug(slug)) return null
  if (st.userId === 'demo') { const p = demoProducts().find((x) => x.slug === slug && x.published); return p ? { ...p, access_code_hash: 'demo' } : null }
  const db: any = serviceClient()
  const { data } = await db.from('dl_products').select(PRODUCT_COLS).eq('user_id', st.userId).eq('slug', slug).eq('published', true).maybeSingle()
  return data || null
}
async function filesOf(st: PublicStore, productId: string): Promise<DlFile[]> {
  if (st.userId === 'demo') return demoFiles(productId)
  const db: any = serviceClient()
  const { data } = await db.from('dl_files').select(FILE_COLS).eq('product_id', productId).order('created_at')
  return data || []
}
export async function findProduct(st: PublicStore, slug: string): Promise<{ product: PublicProduct; files: { name: string; size_bytes: number; mime: string }[]; hasCode: boolean } | null> {
  const r = await productRow(st, slug)
  if (!r) return null
  const files = (await filesOf(st, r.id)).map(({ name, size_bytes, mime }) => ({ name, size_bytes, mime }))
  return { product: strip(toProduct(r)), files, hasCode: !!r.access_code_hash }
}
/** Is the redirect key on a thanks URL valid? (Shown on the thanks page before the buyer clicks.) */
export async function keyValid(st: PublicStore, slug: string, key: unknown): Promise<boolean> {
  if (st.userId === 'demo') return true
  const r = await productRow(st, slug)
  return !!r && isUuid(key) && String(key).toLowerCase() === String(r.redirect_key).toLowerCase()
}

export type ClaimResult = { ok: true; token: string; emailed: boolean } | { ok: false; error: string; status: number }
/** Turns a valid redirect key or access code into a private, capped, expiring order link. */
export async function claim(st: PublicStore, slug: string, input: { key?: unknown; code?: unknown; email: string | null }): Promise<ClaimResult> {
  if (st.userId === 'demo') return { ok: true, token: 'demo', emailed: false }
  const r = await productRow(st, slug)
  if (!r) return { ok: false, error: 'This product isn’t available right now.', status: 404 }
  const files = await filesOf(st, r.id)
  const c = claimCheck({ published: r.published, hasLink: !!r.payment_link, files: files.length, redirectKey: r.redirect_key, codeHash: r.access_code_hash, key: input.key, code: input.code, hash: hashCode })
  if (!c.ok) return { ok: false, error: c.error, status: 403 }
  const db: any = serviceClient()
  const { data: o, error } = await db.from('dl_orders').insert({ user_id: st.userId, product_id: r.id, via: c.via, buyer_email: input.email, max_downloads: r.max_downloads, expires_at: orderExpiry(r.link_days) }).select('id,token,expires_at,max_downloads').single()
  if (error || !o) return { ok: false, error: 'Something went wrong. Please try again.', status: 500 }
  let emailed = false
  if (input.email && deliveryGate({ demo: st.demo, sellerOn: st.email_delivery }).ok) {
    const m = renderDelivery({ storeName: st.title || 'your seller', productTitle: r.title, accent: st.accent, url: downloadPageUrl(o.token), files, maxDownloads: o.max_downloads, expiresAt: o.expires_at, supportEmail: st.support_email })
    emailed = await sendDelivery(input.email, m, deliveryFrom(st.title), st.support_email)
    if (emailed) await db.from('dl_orders').update({ emailed_at: new Date().toISOString() }).eq('id', o.id)
  }
  return { ok: true, token: o.token, emailed }
}

export type OrderView = { demo: boolean; state: 'ok' | 'revoked' | 'expired' | 'used'; downloadsLeft: number; expiresAt: string; product: PublicProduct; files: { id: string; name: string; size_bytes: number; mime: string }[]; store: Pick<Store, 'slug' | 'title' | 'accent' | 'support_email'> }
export async function orderView(token: string): Promise<OrderView | null> {
  if (token === 'demo') {
    const st = demoStore(); const p = demoProducts()[0]
    return { demo: true, state: 'ok', downloadsLeft: 5, expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(), product: strip(p), files: demoFiles(p.id).map(({ id, name, size_bytes, mime }) => ({ id, name, size_bytes, mime })), store: st }
  }
  if (!isUuid(token)) return null
  const db: any = serviceClient()
  const { data: o } = await db.from('dl_orders').select('id,user_id,product_id,downloads,max_downloads,expires_at,revoked').eq('token', token).maybeSingle()
  if (!o) return null
  const { data: p } = await db.from('dl_products').select(PRODUCT_COLS).eq('id', o.product_id).maybeSingle()
  const { data: s } = await db.from('dl_stores').select(STORE_COLS).eq('user_id', o.user_id).maybeSingle()
  if (!p || !s) return null
  const { data: files } = await db.from('dl_files').select(FILE_COLS).eq('product_id', o.product_id).order('created_at')
  const { data: access } = await db.rpc('dl_has_access', { uid: o.user_id })
  const state = access === true || isDemoUser(o.user_id) ? orderState(o) : 'revoked'
  return { demo: false, state, downloadsLeft: Math.max(0, o.max_downloads - o.downloads), expiresAt: o.expires_at, product: strip(toProduct(p)), files: (files || []).map(({ id, name, size_bytes, mime }: DlFile) => ({ id, name, size_bytes, mime })), store: s }
}
/** Counts one download (atomically, capped) and returns a 60-second signed URL, or null. */
export async function signedDownload(token: string, fileId: string): Promise<string | null> {
  if (!isUuid(token) || !isUuid(fileId)) return null
  const db: any = serviceClient()
  const { data: o } = await db.from('dl_orders').select('user_id').eq('token', token).maybeSingle()
  if (!o) return null
  const { data: access } = await db.rpc('dl_has_access', { uid: o.user_id })
  if (access !== true) return null
  const { data: path } = await db.rpc('dl_take_download', { order_token: token, file: fileId })
  if (typeof path !== 'string' || !path.startsWith(`${o.user_id}/`)) return null
  const { data: f } = await db.from('dl_files').select('name').eq('id', fileId).maybeSingle()
  const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL_SECONDS, { download: f?.name || true })
  return signed?.signedUrl || null
}
