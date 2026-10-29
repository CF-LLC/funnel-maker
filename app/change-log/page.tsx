import { createServerClient } from '@/lib/supabase'
import { isDemoUser } from '@/lib/demo'
import { hasAccess } from '@/lib/access'
import { loadProjects } from '@/lib/changelog/load'
import { demoProjects } from '@/lib/changelog/demo'
import { ProjectList } from '@/components/changelog/list'

export const dynamic = 'force-dynamic'
export default async function ChangeLogPage() {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const demo = isDemoUser(user.id)
  if (!demo && !(await hasAccess(user, 'changelog'))) return null
  return <ProjectList demo={demo} projects={demo ? demoProjects() : await loadProjects()} />
}
