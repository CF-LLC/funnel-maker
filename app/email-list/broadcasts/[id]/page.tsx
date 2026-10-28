import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import { isDemoUser } from '@/lib/demo'
import { hasAccess } from '@/lib/access'
import { loadBroadcast, loadSettings, loadSubscribers, sentLast24h } from '@/lib/emaillist/load'
import { demoBroadcasts, demoSettings, demoSubscribers } from '@/lib/emaillist/demo'
import { sendingEnvEnabled } from '@/lib/emaillist/core'
import { resendConfigured } from '@/lib/emaillist/send'
import { Composer } from '@/components/emaillist/composer'

export const dynamic = 'force-dynamic'
export default async function BroadcastPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const demo = isDemoUser(user!.id)
  if (!demo && !(await hasAccess(user, 'emaillist'))) return null
  const b = demo ? demoBroadcasts().find((x) => x.id === id) : await loadBroadcast(id)
  if (!b) notFound()
  const [subs, settings, sent] = demo ? [demoSubscribers(), demoSettings(), 0] : await Promise.all([loadSubscribers(), loadSettings(), sentLast24h(user!.id)])
  const audience = subs.filter((s) => s.status === 'subscribed').map((s) => ({ tags: s.tags }))
  return <Composer initial={b} settings={settings} audience={audience} sentToday={sent} demo={demo} platformSending={sendingEnvEnabled() && resendConfigured()} ownEmail={user!.email || ''} />
}
