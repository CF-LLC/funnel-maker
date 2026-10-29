// Public client view by unguessable token (service role). Never exposes user_id, storage paths or the owner's email.
import { serviceClient } from '@/lib/server/admin-client'
import { BUCKET, COMMENT_COLS, MAX_COMMENTS, SIGNED_TTL_SECONDS, VERSION_COLS, isToken, isUuid, type Comment, type Version } from './core'

export type PublicView = { title: string; client_name: string; owner: string; latest: Version | null; previewUrl: string | null; versions: Pick<Version, 'id' | 'number' | 'status' | 'created_at'>[]; comments: Comment[] }

async function itemByToken(db: any, token: string) {
  if (!isToken(token)) return null
  const { data: i } = await db.from('ap_items').select('id, user_id, title, client_name, revoked, view_count').eq('token', token).maybeSingle()
  if (!i || i.revoked) return null
  const { data: ok } = await db.rpc('ap_has_access', { uid: i.user_id })
  return ok === true ? i : null
}
async function latestVersion(db: any, itemId: string) {
  const { data } = await db.from('ap_versions').select(`${VERSION_COLS},path`).eq('item_id', itemId).order('number', { ascending: false }).limit(1)
  return data?.[0] || null
}

export async function getPublicView(token: string, viewerId: string | null): Promise<PublicView | null> {
  const db: any = serviceClient()
  const i = await itemByToken(db, token)
  if (!i) return null
  const [latest, { data: vs }, { data: cs }, { data: biz }, { data: prof }] = await Promise.all([
    latestVersion(db, i.id),
    db.from('ap_versions').select('id, number, status, created_at').eq('item_id', i.id).order('number', { ascending: false }),
    db.from('ap_comments').select(COMMENT_COLS).eq('item_id', i.id).order('created_at'),
    db.from('inv_profiles').select('business_name').eq('user_id', i.user_id).maybeSingle(),
    db.from('lib_profiles').select('display_name').eq('user_id', i.user_id).maybeSingle(),
  ])
  let previewUrl: string | null = null
  if (latest?.kind === 'file' && latest.path) {
    const { data: s } = await db.storage.from(BUCKET).createSignedUrl(latest.path, SIGNED_TTL_SECONDS)
    previewUrl = s?.signedUrl || null
  }
  if (viewerId !== i.user_id) await db.from('ap_items').update({ last_viewed_at: new Date().toISOString(), view_count: (i.view_count || 0) + 1 }).eq('id', i.id)
  const { path: _p, ...pub } = latest || {}
  return { title: i.title, client_name: i.client_name, owner: biz?.business_name || prof?.display_name || 'Your provider', latest: latest ? (pub as Version) : null, previewUrl, versions: vs || [], comments: cs || [] }
}

/** Client comment on the LATEST version (service role). */
export async function addClientComment(token: string, name: string, body: string): Promise<Comment | null> {
  const db: any = serviceClient()
  const i = await itemByToken(db, token)
  if (!i) return null
  const latest = await latestVersion(db, i.id)
  if (!latest) return null
  const { count } = await db.from('ap_comments').select('id', { count: 'exact', head: true }).eq('item_id', i.id)
  if ((count || 0) >= MAX_COMMENTS) return null
  const { data } = await db.from('ap_comments').insert({ user_id: i.user_id, item_id: i.id, version_id: latest.id, author: 'client', name: name || i.client_name, body }).select(COMMENT_COLS).single()
  return data || null
}

/** Client answers the LATEST version only, and only once per version. A "changes" note is also saved as a comment. */
export async function decideLatest(token: string, versionId: string, d: { status: 'approved' | 'changes'; name: string; note: string | null }): Promise<'ok' | 'stale' | 'missing'> {
  if (!isUuid(versionId)) return 'missing'
  const db: any = serviceClient()
  const i = await itemByToken(db, token)
  if (!i) return 'missing'
  const latest = await latestVersion(db, i.id)
  if (!latest || latest.id !== versionId || latest.status !== 'waiting') return 'stale'
  const now = new Date().toISOString()
  const { data } = await db.from('ap_versions').update({ status: d.status, decided_name: d.name, decided_at: now }).eq('id', versionId).eq('status', 'waiting').select('id')
  if (!data?.length) return 'stale'
  if (d.note) await db.from('ap_comments').insert({ user_id: i.user_id, item_id: i.id, version_id: versionId, author: 'client', name: d.name, body: d.note })
  await db.from('ap_items').update({ updated_at: now }).eq('id', i.id)
  return 'ok'
}
