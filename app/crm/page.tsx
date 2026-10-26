import { createServerClient } from '@/lib/supabase'
import { isDemoUser } from '@/lib/demo'
import { hasAccess } from '@/lib/access'
import { loadContacts } from '@/lib/crm/load'
import { demoContacts } from '@/lib/crm/demo'
import { ContactList } from '@/components/crm/contact-list'

export const dynamic = 'force-dynamic'

export default async function CrmPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const demo = isDemoUser(user!.id)
  if (!demo && !(await hasAccess(user, 'crm'))) return null
  const contacts = demo ? demoContacts() : await loadContacts(user!.id)
  return <ContactList contacts={contacts} demo={demo} today={new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })} />
}
