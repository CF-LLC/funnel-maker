import { createServerClient } from '@/lib/supabase'
import { isDemoUser } from '@/lib/demo'
import { hasAccess } from '@/lib/access'
import { loadStore } from '@/lib/dlstore/load'
import { demoStore } from '@/lib/dlstore/demo'
import { sendingEnvEnabled } from '@/lib/dlstore/core'
import { StoreSettings } from '@/components/dlstore/settings'

export const dynamic = 'force-dynamic'
export default async function SettingsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const demo = isDemoUser(user!.id)
  if (!demo && !(await hasAccess(user, 'downloads'))) return null
  return <StoreSettings initial={demo ? demoStore() : await loadStore()} demo={demo} platformSending={sendingEnvEnabled() && !!process.env.RESEND_API_KEY} />
}
