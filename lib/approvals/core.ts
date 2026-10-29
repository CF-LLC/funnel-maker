// Approval link: pure logic (no I/O). Tested in tests/approvals.test.cjs.
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://saasnation.site').replace(/\/$/, '')
export const BUCKET = 'ap-files'
export const MAX_FILE_BYTES = 25 * 1024 * 1024
export const MAX_STORAGE_BYTES = 500 * 1024 * 1024
export const MAX_ITEMS = 300
export const MAX_VERSIONS = 50
export const MAX_COMMENTS = 300
export const SIGNED_TTL_SECONDS = 120
export const DEMO_TOKEN = 'demo'
/** v1 never sends email: the owner copies the link or opens their own mail app. */
export const APPROVALS_SENDS_EMAIL = false

export type Status = 'waiting' | 'changes' | 'approved'
export type Item = { id: string; title: string; client_name: string; client_email: string | null; token: string; revoked: boolean; last_viewed_at: string | null; view_count: number; created_at: string; updated_at: string }
export type Version = { id: string; item_id: string; number: number; kind: 'file' | 'video'; name: string | null; mime: string | null; size_bytes: number | null; video_url: string | null; note: string | null; status: Status; decided_name: string | null; decided_at: string | null; created_at: string }
export type Comment = { id: string; item_id: string; version_id: string; author: 'owner' | 'client'; name: string | null; body: string; created_at: string }

export const ITEM_COLS = 'id,title,client_name,client_email,token,revoked,last_viewed_at,view_count,created_at,updated_at'
export const VERSION_COLS = 'id,item_id,number,kind,name,mime,size_bytes,video_url,note,status,decided_name,decided_at,created_at'
export const COMMENT_COLS = 'id,item_id,version_id,author,name,body,created_at'
export const STATUS_LABEL: Record<Status, string> = { waiting: 'Waiting', changes: 'Changes requested', approved: 'Approved' }

export const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
export const isToken = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v)
export const approvalUrl = (token: string) => `${SITE}/a/${token}`
export const vLabel = (n: number) => `v${n}`
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
export function cleanEmail(v: unknown): string | null {
  const e = str(v, 200).toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null
}
export function cleanItem(v: any): { ok: true; i: { title: string; client_name: string; client_email: string | null } } | { ok: false; error: string } {
  const title = str(v?.title, 120), client_name = str(v?.client_name, 120)
  if (!title) return { ok: false, error: 'Name what needs approving.' }
  if (!client_name) return { ok: false, error: 'Add the client’s name.' }
  const client_email = v?.client_email ? cleanEmail(v.client_email) : null
  if (v?.client_email && !client_email) return { ok: false, error: 'That email doesn’t look right.' }
  return { ok: true, i: { title, client_name, client_email } }
}
/** Status of an item = status of its latest version (or waiting with none). */
export const itemStatus = (versions: Pick<Version, 'number' | 'status'>[]): Status | 'empty' =>
  versions.length ? [...versions].sort((a, b) => b.number - a.number)[0].status : 'empty'
export const nextNumber = (versions: Pick<Version, 'number'>[]) => versions.reduce((m, v) => Math.max(m, v.number), 0) + 1

export const FILE_TYPES: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }
export const ACCEPT = Object.keys(FILE_TYPES).map((e) => `.${e}`).join(',')
export function checkFile(name: unknown, size: unknown, usedBytes = 0): { ok: true; mime: string; name: string } | { ok: false; error: string } {
  if (typeof name !== 'string' || !name.trim()) return { ok: false, error: 'Pick a file.' }
  const n = name.trim().slice(-200)
  const mime = FILE_TYPES[(n.split('.').pop() || '').toLowerCase()]
  if (!mime || !n.includes('.')) return { ok: false, error: 'Use a PDF, PNG, JPG or WEBP. For video, paste a link instead.' }
  if (typeof size !== 'number' || !Number.isFinite(size) || size < 1) return { ok: false, error: 'That file is empty.' }
  if (size > MAX_FILE_BYTES) return { ok: false, error: 'Files can be up to 25 MB each.' }
  if (usedBytes + size > MAX_STORAGE_BYTES) return { ok: false, error: 'You’ve used your 500 MB of approval storage. Delete old items first.' }
  return { ok: true, mime, name: n }
}
export function objectPath(userId: string, itemId: string, name: string, rand: string) {
  const safe = name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/\.{2,}/g, '.').replace(/-+/g, '-').replace(/^[-.]+|-+$/g, '').slice(-80) || 'file'
  return `${userId}/${itemId}/${rand}-${safe}`
}
export const pathOwned = (path: string, userId: string, itemId: string) => {
  const p = path.split('/')
  return p.length === 3 && p[0] === userId && p[1] === itemId && !path.includes('..') && path.length <= 500
}
/** https only, no credentials. */
export function cleanVideoUrl(v: unknown): string | null {
  const s = str(v, 500)
  try { const u = new URL(s); return u.protocol === 'https:' && !u.username && !u.password ? u.toString() : null } catch { return null }
}
/** YouTube / Vimeo / Loom → an embeddable player URL. Anything else: null (shown as a plain link). */
export function embedUrl(url: string | null): string | null {
  if (!url) return null
  let u: URL; try { u = new URL(url) } catch { return null }
  const h = u.hostname.replace(/^www\./, '').replace(/^m\./, '')
  const id = (s: string | null | undefined) => (s && /^[A-Za-z0-9_-]{4,64}$/.test(s) ? s : null)
  if (h === 'youtu.be') { const v = id(u.pathname.slice(1)); return v ? `https://www.youtube-nocookie.com/embed/${v}` : null }
  if (h === 'youtube.com') {
    const v = id(u.searchParams.get('v')) || id(u.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1])
    return v ? `https://www.youtube-nocookie.com/embed/${v}` : null
  }
  if (h === 'vimeo.com' || h === 'player.vimeo.com') { const v = u.pathname.match(/(\d{5,12})/)?.[1]; return v ? `https://player.vimeo.com/video/${v}` : null }
  if (h === 'loom.com') { const v = id(u.pathname.match(/^\/(?:share|embed)\/([^/]+)/)?.[1]); return v ? `https://www.loom.com/embed/${v}` : null }
  return null
}
export function cleanComment(v: any): { ok: true; body: string; name: string } | { ok: false; error: string } {
  const body = str(v?.body, 2000)
  if (!body) return { ok: false, error: 'Write a comment first.' }
  return { ok: true, body, name: str(v?.name, 120) }
}
export function cleanDecision(v: any): { ok: true; d: { status: 'approved' | 'changes'; name: string; note: string | null } } | { ok: false; error: string } {
  if (v?.decision !== 'approved' && v?.decision !== 'changes') return { ok: false, error: 'Pick Approve or Request changes.' }
  const name = str(v?.name, 120)
  if (!name) return { ok: false, error: 'Please add your name.' }
  const note = str(v?.note, 2000) || null
  if (v.decision === 'changes' && !note) return { ok: false, error: 'Say what you’d like changed.' }
  return { ok: true, d: { status: v.decision, name, note } }
}
export const fmtBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`)
/** Owner's own mail app, prefilled. We never send it. */
export function mailtoHref(clientName: string, email: string | null, title: string, url: string) {
  const first = clientName.split(/\s+/)[0] || 'there'
  const body = `Hi ${first},\n\n"${title}" is ready for you to look at. You can leave comments and approve it (or ask for changes) here:\n${url}\n\nNo login needed; just keep this link to yourself.`
  return `mailto:${encodeURIComponent(email || '')}?subject=${encodeURIComponent(`Ready for your approval: ${title}`)}&body=${encodeURIComponent(body)}`
}
