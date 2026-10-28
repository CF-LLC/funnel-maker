import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import { isDemoUser } from '@/lib/demo'
import { hasAccess } from '@/lib/access'
import { loadProduct, loadStore } from '@/lib/dlstore/load'
import { demoFiles, demoProducts, demoStore } from '@/lib/dlstore/demo'
import { ProductEditor } from '@/components/dlstore/editor'

export const dynamic = 'force-dynamic'
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const demo = isDemoUser(user!.id)
  if (!demo && !(await hasAccess(user, 'downloads'))) return null
  let data
  if (demo) { const p = demoProducts().find((x) => x.id === id); data = p && { product: p, files: demoFiles(p.id), store: demoStore() } }
  else { const r = await loadProduct(id); data = r && { ...r, store: await loadStore() } }
  if (!data) notFound()
  return <ProductEditor initial={data.product} files={data.files} store={data.store} demo={demo} userId={user!.id} />
}
