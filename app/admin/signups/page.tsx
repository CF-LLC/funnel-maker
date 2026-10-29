import { requireAdminPage } from '@/lib/admin/guard'
import { loadSignups } from '@/lib/admin/load3'
import { SignupsView } from '@/components/admin/batch3-views'

export const dynamic = 'force-dynamic'

export default async function AdminSignups() {
  await requireAdminPage('/admin/signups')
  const d = await loadSignups()
  return <SignupsView users={d.users} updates={d.updates} />
}
