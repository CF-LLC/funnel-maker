import { createServerClient } from '@/lib/supabase'
import { isDemoUser } from '@/lib/demo'
import { hasAccess } from '@/lib/access'
import { loadContacts, loadPortals, loadTemplates } from '@/lib/portal/load'
import { demoPortals, demoTemplates } from '@/lib/portal/demo'
import { PortalList } from '@/components/portal/list'

export const dynamic = 'force-dynamic'
export default async function PortalPage() {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const demo = isDemoUser(user.id)
  if (!demo && !(await hasAccess(user, 'portal'))) return null
  if (demo) return <PortalList demo portals={demoPortals()} templates={demoTemplates()} contacts={[{ name: 'Maya Chen', email: 'maya@example.com' }]} />
  const [portals, templates, contacts] = await Promise.all([loadPortals(), loadTemplates(), loadContacts()])
  return <PortalList demo={false} portals={portals} templates={templates} contacts={contacts} />
}
