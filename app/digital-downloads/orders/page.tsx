import { createServerClient } from '@/lib/supabase'
import { isDemoUser } from '@/lib/demo'
import { hasAccess } from '@/lib/access'
import { loadOrders, loadProducts } from '@/lib/dlstore/load'
import { demoOrders, demoProducts } from '@/lib/dlstore/demo'
import { OrdersView } from '@/components/dlstore/orders'

export const dynamic = 'force-dynamic'
export default async function OrdersPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const demo = isDemoUser(user!.id)
  if (!demo && !(await hasAccess(user, 'downloads'))) return null
  const [orders, products] = demo ? [demoOrders(), demoProducts()] : await Promise.all([loadOrders(), loadProducts()])
  return <OrdersView initial={orders} products={products.map((p) => ({ id: p.id, title: p.title }))} demo={demo} />
}
