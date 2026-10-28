import { createServerClient } from '@/lib/supabase'
import { isDemoUser } from '@/lib/demo'
import { hasAccess } from '@/lib/access'
import { loadSettings } from '@/lib/emaillist/load'
import { demoSettings } from '@/lib/emaillist/demo'
import { sendingEnvEnabled } from '@/lib/emaillist/core'
import { resendConfigured } from '@/lib/emaillist/send'
import { SettingsForm } from '@/components/emaillist/settings'

export const dynamic = 'force-dynamic'
export default async function SettingsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const demo = isDemoUser(user!.id)
  if (!demo && !(await hasAccess(user, 'emaillist'))) return null
  return <SettingsForm initial={demo ? demoSettings() : await loadSettings()} demo={demo} platformSending={sendingEnvEnabled() && resendConfigured()} />
}
