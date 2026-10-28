import { requireAdminPage } from '@/lib/admin/guard'
import { loadOverview } from '@/lib/admin/load'
import { OverviewView } from '@/components/admin/views'

export const dynamic = 'force-dynamic'

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  await requireAdminPage('/admin')
  const includeDemo = (await searchParams).demo === '1'
  return <OverviewView data={await loadOverview(includeDemo)} includeDemo={includeDemo} />
}
