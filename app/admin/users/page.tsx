import { requireAdminPage } from '@/lib/admin/guard'
import { loadUsers } from '@/lib/admin/load'
import { UsersView } from '@/components/admin/views'

export const dynamic = 'force-dynamic'

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  await requireAdminPage('/admin/users')
  const includeDemo = (await searchParams).demo === '1'
  const users = await loadUsers()
  return <UsersView users={includeDemo ? users : users.filter((u) => !u.demo)} includeDemo={includeDemo} />
}
