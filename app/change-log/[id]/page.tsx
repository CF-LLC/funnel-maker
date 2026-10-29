import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import { isDemoUser } from '@/lib/demo'
import { hasAccess } from '@/lib/access'
import { loadProject } from '@/lib/changelog/load'
import { demoProjects, demoRequests } from '@/lib/changelog/demo'
import { ProjectEditor } from '@/components/changelog/editor'

export const dynamic = 'force-dynamic'
export default async function ChangeLogProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  if (isDemoUser(user.id)) {
    const p = demoProjects().find((x) => x.id === id) || demoProjects()[0]
    return <ProjectEditor demo project={p} requests={p.id === demoProjects()[0].id ? demoRequests() : []} invoices={[{ id: '00000000-0000-4000-8000-000000000901', number: 'INV-0012', client_name: 'Maya Chen' }]} />
  }
  if (!(await hasAccess(user, 'changelog'))) return null
  const d = await loadProject(id)
  if (!d) notFound()
  return <ProjectEditor demo={false} {...d} />
}
