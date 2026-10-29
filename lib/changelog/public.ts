// Public client view by unguessable token (service role). Never exposes user_id, invoice ids or the owner's email.
import { serviceClient } from '@/lib/server/admin-client'
import { isToken, isUuid, type Req } from './core'

export type PublicReq = Pick<Req, 'id' | 'title' | 'description' | 'est_kind' | 'hours' | 'price_cents' | 'status' | 'decided_name' | 'decided_note' | 'decided_at' | 'created_at'> & { invoiced: boolean }
export type PublicLog = { title: string; client_name: string; currency: string; hourly_rate_cents: number | null; owner: string; requests: PublicReq[] }
const PUB_COLS = 'id,title,description,est_kind,hours,price_cents,status,decided_name,decided_note,decided_at,created_at,invoice_id'

async function projectByToken(db: any, token: string) {
  if (!isToken(token)) return null
  const { data: p } = await db.from('cl_projects').select('id, user_id, title, client_name, currency, hourly_rate_cents, revoked, view_count').eq('token', token).maybeSingle()
  if (!p || p.revoked) return null
  const { data: ok } = await db.rpc('cl_has_access', { uid: p.user_id })
  return ok === true ? p : null
}

export async function getPublicLog(token: string, viewerId: string | null): Promise<PublicLog | null> {
  const db: any = serviceClient()
  const p = await projectByToken(db, token)
  if (!p) return null
  const [{ data: reqs }, { data: biz }, { data: prof }] = await Promise.all([
    db.from('cl_requests').select(PUB_COLS).eq('project_id', p.id).order('created_at'),
    db.from('inv_profiles').select('business_name').eq('user_id', p.user_id).maybeSingle(),
    db.from('lib_profiles').select('display_name').eq('user_id', p.user_id).maybeSingle(),
  ])
  if (viewerId !== p.user_id) await db.from('cl_projects').update({ last_viewed_at: new Date().toISOString(), view_count: (p.view_count || 0) + 1 }).eq('id', p.id)
  const requests = (reqs || []).map(({ invoice_id, ...r }: any) => ({ ...r, invoiced: !!invoice_id }))
  return { title: p.title, client_name: p.client_name, currency: p.currency, hourly_rate_cents: p.hourly_rate_cents, owner: biz?.business_name || prof?.display_name || 'Your provider', requests }
}

/** Client answers a pending request (service role; the DB trigger only lets non-owner roles set decisions). */
export async function decide(token: string, requestId: string, d: { status: 'approved' | 'declined'; name: string; note: string | null }): Promise<boolean> {
  if (!isUuid(requestId)) return false
  const db: any = serviceClient()
  const p = await projectByToken(db, token)
  if (!p) return false
  const { data } = await db.from('cl_requests').update({ status: d.status, decided_name: d.name, decided_note: d.note, decided_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', requestId).eq('project_id', p.id).eq('status', 'pending').select('id')
  return !!data?.length
}
