// Email list: pure logic (no I/O). Rendering, CSV import, validation, the send gate and stats. Tested in tests/emaillist.test.cjs.

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://saasnation.site').replace(/\/$/, '')
export const MAX_IMPORT = 5000
export const MAX_TAGS = 20
export const STATUSES = ['subscribed', 'pending', 'unsubscribed'] as const
export type Status = (typeof STATUSES)[number]
export const STATUS_LABEL: Record<Status, string> = { subscribed: 'Subscribed', pending: 'Awaiting confirmation', unsubscribed: 'Unsubscribed' }
export const CONSENT_LABEL: Record<string, string> = {
  double_opt_in: 'Confirmed by email (double opt-in)',
  single_opt_in: 'Signed up on your form',
  owner_attested: 'Added by you (you confirmed they agreed)',
}

export type Subscriber = {
  id: string; email: string; name: string | null; tags: string[]; status: Status; source: 'manual' | 'import' | 'form'
  consent: string; consent_at: string; consent_detail: string | null; created_at: string; confirmed_at: string | null
  unsubscribed_at: string | null; unsub_broadcast_id: string | null
}
export type Settings = {
  slug: string | null; from_name: string | null; reply_to: string | null; mailing_address: string | null
  page_title: string | null; page_blurb: string | null; double_opt_in: boolean; daily_cap: number; sending_enabled: boolean
}
export type Broadcast = {
  id: string; subject: string; preheader: string; body: string; tag: string | null; status: 'draft' | 'sending' | 'sent' | 'failed'
  recipients: number; sent_count: number; failed_count: number; sent_at: string | null; created_at: string; updated_at: string
}
export const DEFAULT_SETTINGS: Settings = { slug: null, from_name: null, reply_to: null, mailing_address: null, page_title: null, page_blurb: null, double_opt_in: true, daily_cap: 200, sending_enabled: false }

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i
export function normEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const e = v.trim().toLowerCase()
  return e.length >= 3 && e.length <= 320 && EMAIL_RE.test(e) ? e : null
}
export function normTag(v: string): string { return v.trim().toLowerCase().replace(/^#/, '').replace(/[^a-z0-9 _-]/g, '').replace(/\s+/g, '-').slice(0, 40) }
export function normTags(v: unknown): string[] {
  const arr = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[,;|]/) : []
  return [...new Set(arr.filter((x): x is string => typeof x === 'string').map(normTag).filter(Boolean))].slice(0, MAX_TAGS)
}
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/
export const RESERVED_SLUGS = new Set(['admin', 'api', 'confirm', 'unsubscribe', 'u', 'embed', 'www', 'saasnation', 'support', 'help', 'demo-coach'])
export function validSlug(s: string) { return SLUG_RE.test(s) && !RESERVED_SLUGS.has(s) }
export const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '')

// ---------- CSV import ----------
/** RFC 4180-ish CSV parser (quotes, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let f = ''; let q = false
  const s = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++ } else q = false } else f += c; continue }
    if (c === '"') q = true
    else if (c === ',') { row.push(f); f = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(f); f = ''; if (row.some((x) => x.trim())) rows.push(row); row = [] }
    else f += c
  }
  row.push(f); if (row.some((x) => x.trim())) rows.push(row)
  return rows
}
export type ImportRow = { email: string; name: string | null; tags: string[] }
/** Finds email/name/tags columns by header (or assumes column 1 = email when there's no header). Dedupes; reports skipped rows. */
export function csvToRows(text: string, extraTags: string[] = []): { rows: ImportRow[]; skipped: number; duplicates: number; tooMany: boolean } {
  const grid = parseCsv(text)
  if (!grid.length) return { rows: [], skipped: 0, duplicates: 0, tooMany: false }
  const head = grid[0].map((h) => h.trim().toLowerCase())
  const hasHeader = head.some((h) => /e-?mail/.test(h)) && !normEmail(grid[0].find((x) => /@/.test(x)) || '')
  const ei = hasHeader ? head.findIndex((h) => /e-?mail/.test(h)) : 0
  const ni = hasHeader ? head.findIndex((h) => /^(full ?name|name|first ?name)$/.test(h)) : (grid[0].length > 1 ? 1 : -1)
  const ti = hasHeader ? head.findIndex((h) => /^(tags?|lists?)$/.test(h)) : -1
  const seen = new Set<string>(); const rows: ImportRow[] = []; let skipped = 0; let duplicates = 0
  for (const r of hasHeader ? grid.slice(1) : grid) {
    const email = normEmail(r[ei])
    if (!email) { skipped++; continue }
    if (seen.has(email)) { duplicates++; continue }
    seen.add(email)
    rows.push({ email, name: ni >= 0 ? clip(r[ni], 200) || null : null, tags: normTags([...(ti >= 0 ? normTags(r[ti] || '') : []), ...extraTags]) })
  }
  return { rows: rows.slice(0, MAX_IMPORT), skipped, duplicates, tooMany: rows.length > MAX_IMPORT }
}

// ---------- Rendering ----------
export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim()
function safeUrl(u: string): string | null { try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' ? x.toString() : null } catch { return null } }
/** Body is plain text with tiny markdown: blank line = paragraph, **bold**, *italic*, [text](https://url), "- " bullets, "# " heading. */
export function bodyToHtml(body: string): string {
  const inline = (t: string) => esc(t)
    .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#fff;">$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, url) => { const u = safeUrl(url.replace(/&amp;/g, '&')); return u ? `<a href="${esc(u)}" style="color:#c4b5fd;">${txt}</a>` : m })
  return body.replace(/\r\n/g, '\n').split(/\n{2,}/).map((blk) => blk.trim()).filter(Boolean).map((blk) => {
    const lines = blk.split('\n')
    if (lines.every((l) => /^\s*[-*] /.test(l))) return `<ul style="margin:0 0 16px;padding-left:20px;">${lines.map((l) => `<li style="margin:4px 0;">${inline(l.replace(/^\s*[-*] /, ''))}</li>`).join('')}</ul>`
    if (/^# /.test(blk)) return `<h2 style="margin:24px 0 8px;font-size:22px;color:#fff;">${inline(blk.slice(2))}</h2>`
    return `<p style="margin:0 0 16px;">${lines.map(inline).join('<br>')}</p>`
  }).join('\n')
}
export function bodyToText(body: string): string {
  return body.replace(/\r\n/g, '\n').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1 ($2)').trim()
}
export const unsubscribeUrl = (token: string, broadcastId?: string | null) => `${SITE}/e/unsubscribe/${token}${broadcastId ? `?b=${broadcastId}` : ''}`
export const confirmUrl = (token: string) => `${SITE}/e/confirm/${token}`
export const publicPageUrl = (slug: string) => `${SITE}/e/${slug}`

export type Rendered = { subject: string; html: string; text: string }
/** Every broadcast carries: sender name, the owner's mailing address and a one-click unsubscribe link. */
export function renderBroadcast(b: Pick<Broadcast, 'subject' | 'preheader' | 'body'>, s: Pick<Settings, 'from_name' | 'mailing_address'>, unsubUrl: string): Rendered {
  const from = oneLine(s.from_name || 'Your newsletter')
  const addr = (s.mailing_address || '').trim()
  const footer = `You're getting this because you subscribed to ${esc(from)}'s email list.<br><a href="${esc(unsubUrl)}" style="color:#a1a1aa;text-decoration:underline;">Unsubscribe</a> in one click.${addr ? `<br><br>${esc(addr).replace(/\n/g, '<br>')}` : ''}`
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><title>${esc(oneLine(b.subject))}</title></head>
<body style="margin:0;padding:0;background:#0a0a0c;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(oneLine(b.preheader || ''))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0a0a0c" style="background:#0a0a0c;"><tr><td align="center" style="padding:28px 14px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
<tr><td style="padding:0 6px 14px;font:700 12px/1.4 -apple-system,Segoe UI,Roboto,Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#a78bfa;">${esc(from)}</td></tr>
<tr><td bgcolor="#14141a" style="background:#14141a;border:1px solid #26262e;border-radius:18px;padding:30px 28px;font:16px/1.65 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#e4e4e7;">
<h1 style="margin:0 0 18px;font-size:26px;line-height:1.2;color:#ffffff;">${esc(oneLine(b.subject))}</h1>
${bodyToHtml(b.body)}
</td></tr>
<tr><td style="padding:18px 8px;font:12px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#8b8b95;text-align:center;">${footer}</td></tr>
</table></td></tr></table></body></html>`
  const text = [oneLine(b.subject), '', bodyToText(b.body), '', '--', `You're getting this because you subscribed to ${from}'s email list.`, `Unsubscribe: ${unsubUrl}`, ...(addr ? ['', addr] : [])].join('\n')
  return { subject: oneLine(b.subject), html, text }
}
export function renderConfirm(s: Pick<Settings, 'from_name' | 'mailing_address'>, url: string, unsubUrl: string): Rendered {
  const from = oneLine(s.from_name || 'this email list')
  return renderBroadcast({ subject: `Confirm your subscription to ${from}`, preheader: 'One click to confirm.', body: `Please confirm you want emails from ${from}.\n\n[Yes, subscribe me](${url})\n\nIf you didn't ask for this, ignore this email and you won't hear from us again.` }, s, unsubUrl)
}

// ---------- The send gate ----------
export type GateInput = {
  demo: boolean; envEnabled: boolean; resendConfigured: boolean; settings: Settings | null
  sentLast24h: number; recipients: number; broadcast: Pick<Broadcast, 'status' | 'subject' | 'body'>; confirmText?: unknown
}
export type GateResult = { ok: true } | { ok: false; reason: string; code: 'demo' | 'disabled' | 'settings' | 'cap' | 'empty' | 'state' | 'confirm' }
/** Every condition that must hold before a real broadcast goes out. Order matters: the first failure is shown to the user. */
export function sendGate(g: GateInput): GateResult {
  if (g.demo) return { ok: false, code: 'demo', reason: 'This is the demo account, so nothing is sent.' }
  if (g.broadcast.status !== 'draft') return { ok: false, code: 'state', reason: 'This broadcast was already sent.' }
  if (!g.broadcast.subject.trim() || !g.broadcast.body.trim()) return { ok: false, code: 'empty', reason: 'Add a subject and a message first.' }
  const s = g.settings
  if (!s?.from_name?.trim() || !s.mailing_address?.trim()) return { ok: false, code: 'settings', reason: 'Add your sender name and mailing address in Settings first (the law requires an address in every email).' }
  if (!s.sending_enabled) return { ok: false, code: 'demo', reason: 'Demo mode is on in Settings, so nothing is sent. Turn on real sending when you are ready.' }
  if (!g.envEnabled || !g.resendConfigured) return { ok: false, code: 'disabled', reason: 'Sending is not switched on for SaaS Nation yet.' }
  if (g.recipients < 1) return { ok: false, code: 'empty', reason: 'Nobody to send to: no subscribed people match.' }
  if (g.sentLast24h + g.recipients > s.daily_cap) return { ok: false, code: 'cap', reason: `This would go over your daily limit of ${s.daily_cap} emails (${g.sentLast24h} sent in the last 24 hours).` }
  if (g.confirmText !== 'SEND') return { ok: false, code: 'confirm', reason: 'Type SEND to confirm.' }
  return { ok: true }
}
export const sendingEnvEnabled = (env: Record<string, string | undefined> = process.env) => ['1', 'true'].includes(String(env.EMAILLIST_SEND_ENABLED || '').toLowerCase())

export function recipientsFor(subs: Pick<Subscriber, 'status' | 'tags'>[], tag: string | null) {
  return subs.filter((s) => s.status === 'subscribed' && (!tag || s.tags.includes(tag)))
}

// ---------- Stats ----------
export function dailyCounts(dates: string[], days: number, now = new Date()): number[] {
  const out = new Array(days).fill(0)
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  for (const d of dates) { const t = new Date(d); const i = days - 1 - Math.floor((end - Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate())) / 86_400_000); if (i >= 0 && i < days) out[i]++ }
  return out
}
export function listStats(subs: Pick<Subscriber, 'status' | 'created_at' | 'unsubscribed_at' | 'unsub_broadcast_id'>[], now = new Date()) {
  const by = (s: Status) => subs.filter((x) => x.status === s).length
  const since = now.getTime() - 30 * 86_400_000
  return {
    total: subs.length, subscribed: by('subscribed'), pending: by('pending'), unsubscribed: by('unsubscribed'),
    new30: subs.filter((s) => new Date(s.created_at).getTime() >= since).length,
    unsub30: subs.filter((s) => s.unsubscribed_at && new Date(s.unsubscribed_at).getTime() >= since).length,
    signups: dailyCounts(subs.map((s) => s.created_at), 30, now),
    unsubsByBroadcast: subs.reduce<Record<string, number>>((m, s) => { if (s.unsub_broadcast_id) m[s.unsub_broadcast_id] = (m[s.unsub_broadcast_id] || 0) + 1; return m }, {}),
  }
}
export const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 1000) / 10}%` : '–')
