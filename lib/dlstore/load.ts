import { createServerClient } from '@/lib/supabase'
import { DEFAULT_STORE, isUuid, type DlFile, type Order, type Product, type Store } from './core'
import { FILE_COLS, ORDER_COLS, PRODUCT_COLS, STORE_COLS, toProduct } from './guard'

/** Reads with the signed-in session (owner RLS). */
export async function loadStore(): Promise<Store> {
  const db: any = await createServerClient()
  const { data } = await db.from('dl_stores').select(STORE_COLS).maybeSingle()
  return { ...DEFAULT_STORE, ...(data || {}) }
}
export async function loadProducts(): Promise<Product[]> {
  const db: any = await createServerClient()
  const { data } = await db.from('dl_products').select(PRODUCT_COLS).order('sort').order('created_at', { ascending: false }).limit(100)
  return (data || []).map(toProduct)
}
export async function loadProduct(id: string): Promise<{ product: Product; files: DlFile[] } | null> {
  if (!isUuid(id)) return null
  const db: any = await createServerClient()
  const { data } = await db.from('dl_products').select(PRODUCT_COLS).eq('id', id).maybeSingle()
  if (!data) return null
  const { data: files } = await db.from('dl_files').select(FILE_COLS).eq('product_id', id).order('created_at')
  return { product: toProduct(data), files: files || [] }
}
export async function loadOrders(): Promise<Order[]> {
  const db: any = await createServerClient()
  const { data } = await db.from('dl_orders').select(ORDER_COLS).order('created_at', { ascending: false }).limit(500)
  return data || []
}
