import { requireAdminPage } from '@/lib/admin/guard'
import { loadSystem, loadUsers } from '@/lib/admin/load'
import { SystemView } from '@/components/admin/views'

export const dynamic = 'force-dynamic'

export default async function AdminSystem() {
  await requireAdminPage('/admin/system')
  const [s, users] = await Promise.all([loadSystem(), loadUsers()])
  return <SystemView s={s as any} emailOf={Object.fromEntries(users.map((u) => [u.id, u.email]))} />
}
