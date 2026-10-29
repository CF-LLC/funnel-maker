import { createServerClient } from '@/lib/supabase'
import { isDemoUser } from '@/lib/demo'
import { hasAccess } from '@/lib/access'
import { loadTemplates } from '@/lib/portal/load'
import { demoTemplates } from '@/lib/portal/demo'
import { TemplatesEditor } from '@/components/portal/templates'

export const dynamic = 'force-dynamic'
export default async function TemplatesPage() {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const demo = isDemoUser(user.id)
  if (!demo && !(await hasAccess(user, 'portal'))) return null
  return <TemplatesEditor demo={demo} templates={demo ? demoTemplates() : await loadTemplates()} />
}
