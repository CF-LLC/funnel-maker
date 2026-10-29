import { createServerClient } from '@/lib/supabase'
import { isDemoUser } from '@/lib/demo'
import { hasAccess } from '@/lib/access'
import { loadItems } from '@/lib/approvals/load'
import { demoItems } from '@/lib/approvals/demo'
import { ItemList } from '@/components/approvals/list'

export const dynamic = 'force-dynamic'
export default async function ApprovalsPage() {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const demo = isDemoUser(user.id)
  if (!demo && !(await hasAccess(user, 'approvals'))) return null
  return <ItemList demo={demo} items={demo ? demoItems() : await loadItems()} />
}
