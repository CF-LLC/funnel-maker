import { createServerClient } from '@/lib/supabase'
import { isDemoUser } from '@/lib/demo'
import { hasAccess } from '@/lib/access'
import { loadOrders, loadProducts, loadStore } from '@/lib/dlstore/load'
import { demoOrders, demoProducts, demoStore } from '@/lib/dlstore/demo'
import { ProductsView } from '@/components/dlstore/products'

export const dynamic = 'force-dynamic'
export default async function DownloadsHome() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const demo = isDemoUser(user!.id)
  if (!demo && !(await hasAccess(user, 'downloads'))) return null
  const [products, store, orders] = demo ? [demoProducts(), demoStore(), demoOrders()] : await Promise.all([loadProducts(), loadStore(), loadOrders()])
  return <ProductsView initial={products} store={store} orders={orders.length} demo={demo} />
}
