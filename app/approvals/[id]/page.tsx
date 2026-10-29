import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import { isDemoUser } from '@/lib/demo'
import { hasAccess } from '@/lib/access'
import { loadItem } from '@/lib/approvals/load'
import { demoComments, demoItems, demoVersions } from '@/lib/approvals/demo'
import { ItemEditor } from '@/components/approvals/editor'

export const dynamic = 'force-dynamic'
export default async function ApprovalItem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  if (isDemoUser(user.id)) {
    const i = demoItems().find((x) => x.id === id) || demoItems()[0]
    const first = i.id === demoItems()[0].id
    return <ItemEditor demo userId={user.id} item={i} versions={first ? demoVersions() : []} comments={first ? demoComments() : []} usedBytes={2_600_000} />
  }
  if (!(await hasAccess(user, 'approvals'))) return null
  const d = await loadItem(id)
  if (!d) notFound()
  return <ItemEditor demo={false} userId={user.id} {...d} />
}
