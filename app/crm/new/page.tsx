import { createServerClient } from '@/lib/supabase'
import { isDemoUser } from '@/lib/demo'
import { hasAccess } from '@/lib/access'
import { AddClientForm } from '@/components/crm/add-client-form'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Add client · SaaS Nation' }

// Access is checked here and in app/crm/layout.tsx (no access = the layout's locked / pricing card).
export default async function NewClientPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const demo = isDemoUser(user!.id)
  if (!demo && !(await hasAccess(user, 'crm'))) return null
  return <AddClientForm demo={demo} />
}
