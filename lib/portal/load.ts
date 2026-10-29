// Owner reads with the signed-in session (RLS: own rows only).
import { createServerClient } from '@/lib/supabase'
import { FILE_COLS, PORTAL_COLS, TASK_COLS, isUuid, type Portal, type PtFile, type Share, type Task, type Template } from './core'
import { loadItems, type Item } from './items'

export async function loadPortals(): Promise<(Portal & { done: number; total: number })[]> {
  const db: any = await createServerClient()
  const [{ data: portals }, { data: tasks }] = await Promise.all([
    db.from('pt_portals').select(PORTAL_COLS).order('created_at', { ascending: false }).limit(200),
    db.from('pt_tasks').select('portal_id, done_at').limit(10000),
  ])
  return (portals || []).map((p: Portal) => {
    const t = (tasks || []).filter((x: any) => x.portal_id === p.id)
    return { ...p, done: t.filter((x: any) => x.done_at).length, total: t.length }
  })
}
export async function loadTemplates(): Promise<Template[]> {
  const db: any = await createServerClient()
  const { data } = await db.from('pt_templates').select('id, name, items').order('created_at').limit(50)
  return data || []
}
export async function loadContacts(): Promise<{ name: string; email: string }[]> {
  const db: any = await createServerClient()
  const { data } = await db.from('crm_contacts').select('name, email').order('updated_at', { ascending: false }).limit(500)
  return (data || []).filter((c: any) => c.email).map((c: any) => ({ name: c.name || c.email, email: c.email }))
}
export type Candidate = Item & { email: string | null }
export async function loadPortal(id: string, userId: string) {
  if (!isUuid(id)) return null
  const db: any = await createServerClient()
  const { data: portal } = await db.from('pt_portals').select(PORTAL_COLS).eq('id', id).maybeSingle()
  if (!portal) return null
  const [{ data: tasks }, { data: files }, { data: shares }, inv, prp, bk] = await Promise.all([
    db.from('pt_tasks').select(TASK_COLS).eq('portal_id', id).order('sort').order('created_at'),
    db.from('pt_files').select(FILE_COLS).eq('portal_id', id).order('created_at'),
    db.from('pt_shares').select('id, portal_id, kind, ref_id').eq('portal_id', id),
    db.from('inv_invoices').select('id, client_email').order('created_at', { ascending: false }).limit(300),
    db.from('prp_proposals').select('id, client_email').order('created_at', { ascending: false }).limit(300),
    db.from('bk_bookings').select('id, email').order('starts_at', { ascending: false }).limit(300),
  ])
  const refs = [
    ...(inv.data || []).map((r: any) => ({ kind: 'invoice' as const, ref_id: r.id, email: r.client_email })),
    ...(prp.data || []).map((r: any) => ({ kind: 'proposal' as const, ref_id: r.id, email: r.client_email })),
    ...(bk.data || []).map((r: any) => ({ kind: 'booking' as const, ref_id: r.id, email: r.email })),
  ]
  const items = await loadItems(db, userId, refs, false)
  const emailOf = new Map(refs.map((r) => [`${r.kind}:${r.ref_id}`, (r.email || '').toLowerCase() || null]))
  const candidates: Candidate[] = items.map((i) => ({ ...i, email: emailOf.get(`${i.kind}:${i.id}`) ?? null }))
  const { data: used } = await db.from('pt_files').select('size_bytes').limit(5000)
  const usedBytes = (used || []).reduce((s: number, f: any) => s + Number(f.size_bytes), 0)
  return { portal: portal as Portal, tasks: (tasks || []) as Task[], files: (files || []) as PtFile[], shares: (shares || []) as Share[], candidates, usedBytes }
}
