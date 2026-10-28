// Digital downloads store: pure logic (no I/O). Validation, file rules, claim rules, delivery email. Tested in tests/dlstore.test.cjs.

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://saasnation.site').replace(/\/$/, '')
export const BUCKET = 'dl-files'
export const MAX_FILE_BYTES = 50 * 1024 * 1024
export const MAX_FILES_PER_PRODUCT = 10
export const MAX_PRODUCTS = 50
export const SIGNED_TTL_SECONDS = 60
export const DEMO_STORE_SLUG = 'demo-store'

/** Allowed file types: mime → extensions. Must match the dl-files bucket's allowed_mime_types. */
export const FILE_TYPES: Record<string, string[]> = {
  'application/pdf': ['pdf'], 'application/zip': ['zip'], 'application/x-zip-compressed': ['zip'], 'application/epub+zip': ['epub'],
  'audio/mpeg': ['mp3'], 'audio/mp4': ['m4a'], 'video/mp4': ['mp4'], 'image/png': ['png'], 'image/jpeg': ['jpg', 'jpeg'], 'image/webp': ['webp'],
  'text/plain': ['txt'], 'text/csv': ['csv'], 'text/markdown': ['md'],
}
export const ACCEPT = Object.values(FILE_TYPES).flat().map((e) => `.${e}`).filter((v, i, a) => a.indexOf(v) === i).join(',')
const EXT_MIME: Record<string, string> = Object.fromEntries(Object.entries(FILE_TYPES).flatMap(([m, exts]) => exts.map((e) => [e, m])).reverse())

/** Validates a file the seller wants to upload. Returns the mime to store (from the extension, not the browser guess). */
export function checkFile(name: unknown, size: unknown): { ok: true; mime: string; name: string } | { ok: false; error: string } {
  if (typeof name !== 'string' || !name.trim()) return { ok: false, error: 'Pick a file.' }
  const n = name.trim().slice(-200)
  const ext = (n.split('.').pop() || '').toLowerCase()
  const mime = EXT_MIME[ext]
  if (!mime || !n.includes('.')) return { ok: false, error: 'That file type isn’t supported. Use PDF, ZIP, EPUB, MP3, M4A, MP4, PNG, JPG, WEBP, TXT, CSV or MD.' }
  if (typeof size !== 'number' || !Number.isFinite(size) || size < 1) return { ok: false, error: 'That file is empty.' }
  if (size > MAX_FILE_BYTES) return { ok: false, error: 'Files can be up to 50 MB each.' }
  return { ok: true, mime, name: n }
}
/** Object path inside the bucket: "<userId>/<productId>/<random>-<safe name>". */
export function objectPath(userId: string, productId: string, name: string, rand: string) {
  const safe = name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/\.{2,}/g, '.').replace(/-+/g, '-').replace(/^[-.]+|-+$/g, '').slice(-80) || 'file'
  return `${userId}/${productId}/${rand}-${safe}`
}
export const pathOwned = (path: string, userId: string, productId: string) => {
  const p = path.split('/')
  return p.length === 3 && p[0] === userId && p[1] === productId && !path.includes('..') && path.length <= 500
}

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/
export const PRODUCT_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/
export const RESERVED_SLUGS = new Set(['admin', 'api', 'www', 'saasnation', 'support', 'help', 'new', 'thanks', DEMO_STORE_SLUG])
export const validStoreSlug = (s: string) => SLUG_RE.test(s) && !RESERVED_SLUGS.has(s)
export const validProductSlug = (s: string) => PRODUCT_SLUG_RE.test(s) && s !== 'thanks'
export const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '')
export const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '')

/** Only the seller's own Stripe Payment Link (buy.stripe.com or checkout.stripe.com) over https. */
export function validPaymentLink(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (!/^https:\/\/(buy\.stripe\.com|checkout\.stripe\.com)\/[A-Za-z0-9/_?=&%.-]{1,300}$/.test(s)) return null
  try { const u = new URL(s); return u.protocol === 'https:' && !u.username && !u.password ? s : null } catch { return null }
}

export const ACCENTS = ['#e50914', '#f59e0b', '#22d3ee', '#a855f7', '#22c55e', '#f472b6', '#ffffff'] as const
export const KINDS = { pdf: 'PDF guide', course: 'Course', template: 'Template', audio: 'Audio', video: 'Video', bundle: 'Bundle', other: 'Download' } as const
export type Kind = keyof typeof KINDS

/** Access codes: 4–40 letters/digits/dashes, case-insensitive. Stored only as a sha256 hash. */
export const normCode = (v: unknown) => (typeof v === 'string' ? v.trim().toUpperCase().replace(/\s+/g, '') : '')
export const validCode = (c: string) => /^[A-Z0-9-]{4,40}$/.test(c)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v)

export type Store = { slug: string | null; title: string | null; blurb: string | null; accent: string; support_email: string | null; email_delivery: boolean }
export type Product = {
  id: string; slug: string; title: string; subtitle: string | null; description: string | null; kind: Kind; price_label: string | null
  payment_link: string | null; redirect_key: string; has_code: boolean; max_downloads: number; link_days: number; published: boolean
  sort: number; download_count: number; created_at: string; updated_at: string
}
export type DlFile = { id: string; product_id: string; name: string; size_bytes: number; mime: string; download_count: number; created_at: string }
export type Order = { id: string; product_id: string; via: 'redirect' | 'code'; buyer_email: string | null; downloads: number; max_downloads: number; expires_at: string; revoked: boolean; emailed_at: string | null; created_at: string }
export const DEFAULT_STORE: Store = { slug: null, title: null, blurb: null, accent: '#e50914', support_email: null, email_delivery: false }

export const storeUrl = (slug: string) => `${SITE}/s/${slug}`
export const productUrl = (slug: string, p: string) => `${SITE}/s/${slug}/${p}`
/** The URL the seller pastes into their Stripe Payment Link → After payment → "Don't show confirmation page" → redirect. */
export const redirectUrl = (slug: string, p: string, key: string) => `${SITE}/s/${slug}/${p}/thanks?k=${key}`
export const downloadPageUrl = (token: string) => `${SITE}/d/${token}`

/** What a purchase claim must satisfy. A valid redirect key OR access code; the product must be live with files. */
export type ClaimInput = { published: boolean; hasLink: boolean; files: number; redirectKey: string; codeHash: string | null; key?: unknown; code?: unknown; hash: (c: string) => string }
export function claimCheck(c: ClaimInput): { ok: true; via: 'redirect' | 'code' } | { ok: false; error: string } {
  if (!c.published || !c.hasLink) return { ok: false, error: 'This product isn’t available right now.' }
  if (c.files < 1) return { ok: false, error: 'The seller hasn’t added the files yet. Please contact them.' }
  if (isUuid(c.key) && c.key.toLowerCase() === c.redirectKey.toLowerCase()) return { ok: true, via: 'redirect' }
  const code = normCode(c.code)
  if (code && c.codeHash && validCode(code) && c.hash(code) === c.codeHash) return { ok: true, via: 'code' }
  if (code) return { ok: false, error: 'That access code isn’t right. Check your receipt or the payment confirmation page.' }
  return { ok: false, error: 'This link has expired or was changed by the seller. Enter the access code from your receipt instead.' }
}
export const orderExpiry = (linkDays: number, now = Date.now()) => new Date(now + Math.min(90, Math.max(1, linkDays)) * 86_400_000).toISOString()
export function orderState(o: Pick<Order, 'revoked' | 'expires_at' | 'downloads' | 'max_downloads'>, now = Date.now()): 'ok' | 'revoked' | 'expired' | 'used' {
  if (o.revoked) return 'revoked'
  if (new Date(o.expires_at).getTime() < now) return 'expired'
  if (o.downloads >= o.max_downloads) return 'used'
  return 'ok'
}
export const fmtBytes = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`)

// ---------- Delivery email (Resend). Off unless DOWNLOADS_SEND_ENABLED and the seller turned it on. ----------
export const sendingEnvEnabled = (env: Record<string, string | undefined> = process.env) => ['1', 'true'].includes(String(env.DOWNLOADS_SEND_ENABLED || '').toLowerCase())
export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim()
export type DeliveryMail = { subject: string; html: string; text: string }
export function renderDelivery(d: { storeName: string; productTitle: string; accent: string; url: string; files: { name: string; size_bytes: number }[]; maxDownloads: number; expiresAt: string; supportEmail: string | null }): DeliveryMail {
  const store = oneLine(d.storeName) || 'your seller'; const title = oneLine(d.productTitle)
  const accent = /^#[0-9a-f]{6}$/i.test(d.accent) ? d.accent : '#e50914'
  const until = new Date(d.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  const fileRows = d.files.map((f) => `<tr><td style="padding:10px 0;border-top:1px solid #26262b;color:#e4e4e7;font-size:14px">&#128190;&nbsp; ${esc(f.name)}</td><td style="padding:10px 0;border-top:1px solid #26262b;color:#71717a;font-size:13px;text-align:right">${fmtBytes(f.size_bytes)}</td></tr>`).join('')
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${esc(title)}</title></head>
<body style="margin:0;background:#050507;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden">Your download is ready: ${esc(title)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050507"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0d0d10;border:1px solid #1f1f24;border-radius:18px;overflow:hidden">
<tr><td style="padding:34px 28px 26px;background:linear-gradient(160deg,${accent}55,#0d0d10 70%)">
<div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${accent};font-weight:700">${esc(store)}</div>
<div style="margin-top:10px;font-size:28px;line-height:1.15;font-weight:800;color:#ffffff">Your download is ready</div>
<div style="margin-top:8px;font-size:16px;color:#d4d4d8">${esc(title)}</div></td></tr>
<tr><td style="padding:8px 28px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${fileRows}</table></td></tr>
<tr><td align="center" style="padding:22px 28px 8px"><a href="${esc(d.url)}" style="display:inline-block;background:${accent};color:${accent.toLowerCase() === '#ffffff' ? '#000000' : '#ffffff'};text-decoration:none;font-weight:700;font-size:16px;padding:14px 34px;border-radius:999px">Get your files</a></td></tr>
<tr><td style="padding:10px 28px 26px;color:#a1a1aa;font-size:13px;line-height:1.6;text-align:center">This private link works until ${esc(until)} for up to ${d.maxDownloads} downloads. Please don’t share it.${d.supportEmail ? `<br>Questions? Reply to <a href="mailto:${esc(d.supportEmail)}" style="color:#e4e4e7">${esc(d.supportEmail)}</a>.` : ''}</td></tr>
<tr><td style="padding:14px 28px;background:#08080a;color:#52525b;font-size:11px;text-align:center">Sold by ${esc(store)} · Delivered by SaaS Nation. You got this email because you bought this product.</td></tr>
</table></td></tr></table></body></html>`
  const text = `Your download is ready: ${title}\nfrom ${store}\n\nGet your files: ${d.url}\n\nFiles:\n${d.files.map((f) => `- ${f.name} (${fmtBytes(f.size_bytes)})`).join('\n')}\n\nThis private link works until ${until} for up to ${d.maxDownloads} downloads. Please don't share it.${d.supportEmail ? `\nQuestions? ${d.supportEmail}` : ''}\n\nSold by ${store}. Delivered by SaaS Nation.`
  return { subject: `Your download: ${title}`.slice(0, 200), html, text }
}
