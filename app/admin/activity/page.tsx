import { requireAdminPage } from '@/lib/admin/guard'
import { loadActivity, loadUsers } from '@/lib/admin/load'
import { ActivityView } from '@/components/admin/views'

export const dynamic = 'force-dynamic'

export default async function AdminActivity({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  await requireAdminPage('/admin/activity')
  const includeDemo = (await searchParams).demo === '1'
  const [a, users] = await Promise.all([loadActivity(includeDemo), loadUsers()])
  return <ActivityView a={a as any} ownerEmail={Object.fromEntries(users.map((u) => [u.id, u.email]))} />
}
