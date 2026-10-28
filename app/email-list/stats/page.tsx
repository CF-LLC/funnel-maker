import { createServerClient } from '@/lib/supabase'
import { isDemoUser } from '@/lib/demo'
import { hasAccess } from '@/lib/access'
import { loadBroadcasts, loadSettings, loadSubscribers, sentLast24h } from '@/lib/emaillist/load'
import { demoBroadcasts, demoSettings, demoSubscribers } from '@/lib/emaillist/demo'
import { listStats } from '@/lib/emaillist/core'
import { StatsView } from '@/components/emaillist/stats'

export const dynamic = 'force-dynamic'
export default async function StatsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const demo = isDemoUser(user!.id)
  if (!demo && !(await hasAccess(user, 'emaillist'))) return null
  const [subs, broadcasts, settings, sent] = demo ? [demoSubscribers(), demoBroadcasts(), demoSettings(), 0] : await Promise.all([loadSubscribers(), loadBroadcasts(), loadSettings(), sentLast24h(user!.id)])
  return <StatsView stats={listStats(subs)} broadcasts={broadcasts.filter((b) => b.status !== 'draft')} cap={settings.daily_cap} sentToday={sent} />
}
