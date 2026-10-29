import { requireAdminPage } from '@/lib/admin/guard'
import { loadFunnel } from '@/lib/admin/load'
import { FunnelView } from '@/components/admin/views'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admin · Funnel', robots: { index: false, follow: false } }

export default async function AdminFunnel() {
  await requireAdminPage('/admin/funnel')
  return <FunnelView f={await loadFunnel(30)} />
}
