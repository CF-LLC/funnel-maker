import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import { isDemoUser } from '@/lib/demo'
import { hasAccess } from '@/lib/access'
import { loadPortal } from '@/lib/portal/load'
import { demoCandidates, demoFiles, demoPortals, demoTasks } from '@/lib/portal/demo'
import { PortalEditor } from '@/components/portal/editor'

export const dynamic = 'force-dynamic'
export default async function PortalEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  if (isDemoUser(user.id)) {
    const p = demoPortals().find((x) => x.id === id) || demoPortals()[0]
    const c = demoCandidates()
    return <PortalEditor demo userId={user.id} portal={p} tasks={p.id === demoPortals()[0].id ? demoTasks() : []} files={demoFiles()} shares={c.map((i) => ({ id: i.id, portal_id: p.id, kind: i.kind, ref_id: i.id }))} candidates={c} usedBytes={2_760_000} />
  }
  if (!(await hasAccess(user, 'portal'))) return null
  const d = await loadPortal(id, user.id)
  if (!d) notFound()
  return <PortalEditor demo={false} userId={user.id} {...d} />
}
