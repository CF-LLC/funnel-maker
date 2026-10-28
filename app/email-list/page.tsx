import { createServerClient } from '@/lib/supabase'
import { isDemoUser } from '@/lib/demo'
import { hasAccess } from '@/lib/access'
import { loadSettings, loadSubscribers } from '@/lib/emaillist/load'
import { demoSettings, demoSubscribers } from '@/lib/emaillist/demo'
import { SubscribersView } from '@/components/emaillist/subscribers'

export const dynamic = 'force-dynamic'
export default async function EmailListPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const demo = isDemoUser(user!.id)
  if (!demo && !(await hasAccess(user, 'emaillist'))) return null
  const [subs, settings] = demo ? [demoSubscribers(), demoSettings()] : await Promise.all([loadSubscribers(), loadSettings()])
  return <SubscribersView initial={subs} settings={settings} demo={demo} />
}
