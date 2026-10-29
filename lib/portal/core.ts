// Client portal: pure logic (no I/O). Tested in tests/portal.test.cjs.
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://saasnation.site').replace(/\/$/, '')
export const BUCKET = 'pt-files'
export const MAX_FILE_BYTES = 25 * 1024 * 1024
export const MAX_STORAGE_BYTES = 500 * 1024 * 1024
export const MAX_FILES_PER_PORTAL = 30
export const MAX_PORTALS = 200
export const MAX_TASKS = 30
export const MAX_TEMPLATES = 20
export const SIGNED_TTL_SECONDS = 60
export const DEMO_TOKEN = 'demo'
/** Never sends email in v1: invites are copy-link or the owner's own mail app (mailto). */
export const PORTAL_SENDS_EMAIL = false

export type Who = 'client' | 'owner'
export type Kind = 'invoice' | 'proposal' | 'booking'
export const KINDS: Kind[] = ['invoice', 'proposal', 'booking']
export type Portal = { id: string; client_name: string; client_email: string | null; welcome: string | null; token: string; revoked: boolean; last_viewed_at: string | null; view_count: number; created_at: string; updated_at: string }
export type Task = { id: string; portal_id: string; title: string; note: string | null; link: string | null; who: Who; sort: number; done_at: string | null; done_by: Who | null }
export type PtFile = { id: string; portal_id: string; name: string; size_bytes: number; mime: string; download_count: number; created_at: string }
export type Share = { id: string; portal_id: string; kind: Kind; ref_id: string }
export type TemplateItem = { title: string; note?: string | null; link?: string | null; who: Who }
export type Template = { id: string; name: string; items: TemplateItem[] }

export const PORTAL_COLS = 'id,client_name,client_email,welcome,token,revoked,last_viewed_at,view_count,created_at,updated_at'
export const TASK_COLS = 'id,portal_id,title,note,link,who,sort,done_at,done_by'
export const FILE_COLS = 'id,portal_id,name,size_bytes,mime,download_count,created_at'

export const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
export const isToken = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v)
export const portalUrl = (token: string) => `${SITE}/p/${token}`

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
export const cleanEmail = (v: unknown): string | null => {
  const e = str(v, 320).toLowerCase()
  return e && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? e : null
}
export const cleanLink = (v: unknown): string | null => {
  const l = str(v, 500)
  if (!l) return null
  try { const u = new URL(l); return u.protocol === 'https:' ? u.toString() : null } catch { return null }
}
export function cleanTask(v: any): { ok: true; task: TemplateItem } | { ok: false; error: string } {
  const title = str(v?.title, 160)
  if (!title) return { ok: false, error: 'Give the step a title.' }
  if (v?.link && !cleanLink(v.link)) return { ok: false, error: 'Links must start with https://' }
  return { ok: true, task: { title, note: str(v?.note, 600) || null, link: cleanLink(v?.link), who: v?.who === 'owner' ? 'owner' : 'client' } }
}
export function cleanItems(v: unknown): TemplateItem[] | null {
  if (!Array.isArray(v) || v.length > MAX_TASKS) return null
  const out: TemplateItem[] = []
  for (const it of v) { const c = cleanTask(it); if (!c.ok) return null; out.push(c.task) }
  return out
}
export function progress(tasks: Pick<Task, 'done_at'>[]) {
  const done = tasks.filter((t) => t.done_at).length
  return { done, total: tasks.length, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0 }
}
/** Owner's own mail app, prefilled. We never send it. */
export function mailtoHref(clientName: string, email: string | null, url: string, from?: string | null) {
  const first = clientName.split(/\s+/)[0] || 'there'
  const body = `Hi ${first},\n\nHere's your private client portal. It has your checklist, files and anything we're working on together:\n${url}\n\nNo login needed; just keep this link to yourself.\n\n${from || ''}`.trim()
  return `mailto:${encodeURIComponent(email || '')}?subject=${encodeURIComponent('Your client portal')}&body=${encodeURIComponent(body)}`
}

/** Allowed file types: extension → mime. Must match the pt-files bucket's allowed_mime_types. */
export const FILE_TYPES: Record<string, string> = {
  pdf: 'application/pdf', zip: 'application/zip', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', txt: 'text/plain', csv: 'text/csv',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}
export const ACCEPT = Object.keys(FILE_TYPES).map((e) => `.${e}`).join(',')
export function checkFile(name: unknown, size: unknown, usedBytes = 0): { ok: true; mime: string; name: string } | { ok: false; error: string } {
  if (typeof name !== 'string' || !name.trim()) return { ok: false, error: 'Pick a file.' }
  const n = name.trim().slice(-200)
  const mime = FILE_TYPES[(n.split('.').pop() || '').toLowerCase()]
  if (!mime || !n.includes('.')) return { ok: false, error: 'Use PDF, ZIP, PNG, JPG, WEBP, TXT, CSV, DOCX, XLSX or PPTX.' }
  if (typeof size !== 'number' || !Number.isFinite(size) || size < 1) return { ok: false, error: 'That file is empty.' }
  if (size > MAX_FILE_BYTES) return { ok: false, error: 'Files can be up to 25 MB each.' }
  if (usedBytes + size > MAX_STORAGE_BYTES) return { ok: false, error: 'You’ve used your 500 MB of portal storage. Remove old files first.' }
  return { ok: true, mime, name: n }
}
export function objectPath(userId: string, portalId: string, name: string, rand: string) {
  const safe = name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/\.{2,}/g, '.').replace(/-+/g, '-').replace(/^[-.]+|-+$/g, '').slice(-80) || 'file'
  return `${userId}/${portalId}/${rand}-${safe}`
}
export const pathOwned = (path: string, userId: string, portalId: string) => {
  const p = path.split('/')
  return p.length === 3 && p[0] === userId && p[1] === portalId && !path.includes('..') && path.length <= 500
}
export const fmtBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`)
export const money = (cents: number, cur = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur || 'USD' }).format(cents / 100)

export const STARTER_TEMPLATE: TemplateItem[] = [
  { title: 'Fill in the welcome questionnaire', who: 'client' },
  { title: 'Book your kickoff call', who: 'client' },
  { title: 'Pay the first invoice', who: 'client' },
  { title: 'Send the welcome pack', who: 'owner' },
  { title: 'Kickoff call done', who: 'owner' },
]
