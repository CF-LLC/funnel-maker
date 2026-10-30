import type { TtProject } from './core'

/** Projects from Time tracking (if any), flattened with their client. RLS returns only the user's own. */
export async function loadProjects(db: any): Promise<TtProject[]> {
  const [{ data: ps }, { data: cs }] = await Promise.all([
    db.from('tt_projects').select('id, name, client_id, archived').limit(1000),
    db.from('tt_clients').select('id, name, email, crm_email').limit(1000),
  ])
  const c = new Map((cs || []).map((x: any) => [x.id, x]))
  return (ps || []).filter((p: any) => c.has(p.client_id)).map((p: any) => {
    const k: any = c.get(p.client_id)
    return { id: p.id, name: p.name, client_id: p.client_id, client_name: k.name, client_email: k.email, client_crm_email: k.crm_email }
  })
}
