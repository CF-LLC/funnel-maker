import { notFound } from 'next/navigation'
import { requireAdminPage } from '@/lib/admin/guard'
import { audit } from '@/lib/admin/load'
import { loadUserView } from '@/lib/admin/load3'
import { UserReadOnlyView } from '@/components/admin/batch3-views'

export const dynamic = 'force-dynamic'

/** Read-only "view as user": renders a snapshot with the service role. No session switch, no write controls. Every view is audited. */
export default async function ViewAsUser({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const adminId = await requireAdminPage(`/admin/users/${userId}/view`)
  if (!/^[0-9a-f-]{36}$/i.test(userId)) notFound()
  const v = await loadUserView(userId)
  if (!v) notFound()
  const { error } = await audit(adminId, 'view_as_user', userId, { mode: 'read_only' })
  if (error) throw new Error('Audit write failed; refusing to show user data')
  return <UserReadOnlyView v={v} />
}
