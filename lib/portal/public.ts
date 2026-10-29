// Public client view by unguessable token (service role). Never exposes ids of other rows, user_id or the owner's email.
import { serviceClient } from '@/lib/server/admin-client'
import { BUCKET, FILE_COLS, SIGNED_TTL_SECONDS, TASK_COLS, isToken, isUuid, type PtFile, type Task } from './core'
import { loadItems, type Item } from './items'

export type PublicPortal = { id: string; userId: string; client_name: string; welcome: string | null; owner: string; tasks: Task[]; files: PtFile[]; items: Item[] }

async function portalByToken(db: any, token: string) {
  if (!isToken(token)) return null
  const { data: p } = await db.from('pt_portals').select('id, user_id, client_name, welcome, revoked').eq('token', token).maybeSingle()
  if (!p || p.revoked) return null
  const { data: ok } = await db.rpc('pt_has_access', { uid: p.user_id })
  return ok === true ? p : null
}

export async function getPublicPortal(token: string, viewerId: string | null): Promise<PublicPortal | null> {
  const db: any = serviceClient()
  const p = await portalByToken(db, token)
  if (!p) return null
  const [{ data: tasks }, { data: files }, { data: shares }, { data: biz }, { data: prof }] = await Promise.all([
    db.from('pt_tasks').select(TASK_COLS).eq('portal_id', p.id).order('sort').order('created_at'),
    db.from('pt_files').select(FILE_COLS).eq('portal_id', p.id).order('created_at'),
    db.from('pt_shares').select('kind, ref_id').eq('portal_id', p.id),
    db.from('inv_profiles').select('business_name').eq('user_id', p.user_id).maybeSingle(),
    db.from('lib_profiles').select('display_name').eq('user_id', p.user_id).maybeSingle(),
  ])
  const items = await loadItems(db, p.user_id, shares || [], true)
  if (viewerId !== p.user_id) {
    const { data: cur } = await db.from('pt_portals').select('view_count').eq('id', p.id).single()
    await db.from('pt_portals').update({ last_viewed_at: new Date().toISOString(), view_count: (cur?.view_count || 0) + 1 }).eq('id', p.id)
  }
  return { id: p.id, userId: p.user_id, client_name: p.client_name, welcome: p.welcome, owner: biz?.business_name || prof?.display_name || 'Your coach', tasks: tasks || [], files: files || [], items }
}

/** Client ticks one of THEIR steps (who = client). Owner steps can't be ticked from the portal. */
export async function tickTask(token: string, taskId: string, done: boolean): Promise<boolean> {
  if (!isUuid(taskId)) return false
  const db: any = serviceClient()
  const p = await portalByToken(db, token)
  if (!p) return false
  const { data } = await db.from('pt_tasks').update(done ? { done_at: new Date().toISOString(), done_by: 'client' } : { done_at: null, done_by: null })
    .eq('id', taskId).eq('portal_id', p.id).eq('who', 'client').select('id')
  return !!data?.length
}

/** 60-second signed URL for one of this portal's files. */
export async function fileUrl(token: string, fileId: string): Promise<string | null> {
  if (!isUuid(fileId)) return null
  const db: any = serviceClient()
  const p = await portalByToken(db, token)
  if (!p) return null
  const { data: f } = await db.from('pt_files').select('id, path, name, download_count').eq('id', fileId).eq('portal_id', p.id).maybeSingle()
  if (!f) return null
  const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(f.path, SIGNED_TTL_SECONDS, { download: f.name })
  if (!signed?.signedUrl) return null
  await db.from('pt_files').update({ download_count: (f.download_count || 0) + 1 }).eq('id', f.id)
  return signed.signedUrl
}
