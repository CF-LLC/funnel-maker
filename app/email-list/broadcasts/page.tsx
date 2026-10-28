import { createServerClient } from '@/lib/supabase'
import { isDemoUser } from '@/lib/demo'
import { hasAccess } from '@/lib/access'
import { loadBroadcasts, loadSubscribers } from '@/lib/emaillist/load'
import { demoBroadcasts, demoSubscribers } from '@/lib/emaillist/demo'
import { listStats } from '@/lib/emaillist/core'
import { BroadcastList } from '@/components/emaillist/broadcasts'

export const dynamic = 'force-dynamic'
export default async function BroadcastsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const demo = isDemoUser(user!.id)
  if (!demo && !(await hasAccess(user, 'emaillist'))) return null
  const [list, subs] = demo ? [demoBroadcasts(), demoSubscribers()] : await Promise.all([loadBroadcasts(), loadSubscribers()])
  return <BroadcastList broadcasts={list} unsubs={listStats(subs).unsubsByBroadcast} demo={demo} />
}
