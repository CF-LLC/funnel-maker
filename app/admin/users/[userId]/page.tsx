import { notFound } from 'next/navigation'
import { requireAdminPage } from '@/lib/admin/guard'
import { loadUserDetail } from '@/lib/admin/load'
import { GRANTABLE } from '@/lib/admin/tools'
import { UserDetailView } from '@/components/admin/views'

export const dynamic = 'force-dynamic'

export default async function AdminUser({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const adminId = await requireAdminPage(`/admin/users/${userId}`)
  if (!/^[0-9a-f-]{36}$/i.test(userId)) notFound()
  const d = await loadUserDetail(userId)
  if (!d) notFound()
  return <UserDetailView d={d as any} tools={GRANTABLE} adminId={adminId} />
}
