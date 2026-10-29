// Owner reads with the signed-in session (RLS: own rows only).
import { createServerClient } from '@/lib/supabase'
import { PROJECT_COLS, REQ_COLS, isUuid, totals, type Project, type Req } from './core'

export type ProjectRow = Project & { approved: number; pending: number; pendingCount: number; readyCount: number }
export async function loadProjects(): Promise<ProjectRow[]> {
  const db: any = await createServerClient()
  const [{ data: ps }, { data: rs }] = await Promise.all([
    db.from('cl_projects').select(PROJECT_COLS).order('created_at', { ascending: false }).limit(200),
    db.from('cl_requests').select(REQ_COLS).limit(10000),
  ])
  return (ps || []).map((p: Project) => {
    const t = totals((rs || []).filter((r: Req) => r.project_id === p.id), p.hourly_rate_cents)
    return { ...p, approved: t.approved, pending: t.pending, pendingCount: t.pendingCount, readyCount: t.readyCount }
  })
}
export type OpenInvoice = { id: string; number: string; client_name: string | null }
export async function loadProject(id: string) {
  if (!isUuid(id)) return null
  const db: any = await createServerClient()
  const { data: project } = await db.from('cl_projects').select(PROJECT_COLS).eq('id', id).maybeSingle()
  if (!project) return null
  const [{ data: requests }, { data: invoices }] = await Promise.all([
    db.from('cl_requests').select(REQ_COLS).eq('project_id', id).order('created_at'),
    db.from('inv_invoices').select('id, number, client_name').eq('status', 'unpaid').order('created_at', { ascending: false }).limit(100),
  ])
  return { project: project as Project, requests: (requests || []) as Req[], invoices: (invoices || []) as OpenInvoice[] }
}
