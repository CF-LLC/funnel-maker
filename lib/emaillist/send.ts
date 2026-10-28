// Email list sending through Resend (same account and verified domain as Booking emails).
// Never called in demo mode; every caller must pass sendGate() first. No-op without RESEND_API_KEY.
import { type Rendered } from './core'

export const DEFAULT_LIST_FROM = 'lists@saasnation.site'
export const resendConfigured = () => !!process.env.RESEND_API_KEY

/** "Jane Coach via SaaS Nation <lists@saasnation.site>". Display name is sanitized; address comes from env only. */
export function fromHeader(fromName: string | null, env: Record<string, string | undefined> = process.env) {
  const addr = (env.EMAILLIST_EMAIL_FROM || DEFAULT_LIST_FROM).replace(/^.*<([^>]+)>.*$/, '$1').trim()
  const name = (fromName || 'SaaS Nation').replace(/["<>\r\n\\]/g, '').trim().slice(0, 60) || 'SaaS Nation'
  return `"${name} via SaaS Nation" <${addr}>`
}

export type ListMail = Rendered & { to: string; unsubUrl: string; oneClickUrl: string }
/** One Resend email object with RFC 8058 one-click unsubscribe headers. Exported for tests. */
export function listPayload(m: ListMail, from: string, replyTo: string | null) {
  return {
    from, to: [m.to], subject: m.subject, html: m.html, text: m.text, ...(replyTo ? { reply_to: replyTo } : {}),
    headers: { 'List-Unsubscribe': `<${m.oneClickUrl}>, <${m.unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  }
}

/** Sends up to 100 per Resend batch call. Returns per-recipient success flags in input order. Never throws. */
export async function sendBatch(mails: ListMail[], from: string, replyTo: string | null, f: typeof fetch = fetch): Promise<boolean[]> {
  const key = process.env.RESEND_API_KEY
  const out: boolean[] = []
  for (let i = 0; i < mails.length; i += 100) {
    const chunk = mails.slice(i, i + 100)
    if (!key) { out.push(...chunk.map(() => false)); continue }
    try {
      const res = await f('https://api.resend.com/emails/batch', {
        method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk.map((m) => listPayload(m, from, replyTo))), signal: AbortSignal.timeout(20000),
      })
      if (!res.ok) console.error('[emaillist] batch failed', res.status, (await res.text().catch(() => '')).slice(0, 200))
      out.push(...chunk.map(() => res.ok))
    } catch (e) { console.error('[emaillist] batch error', (e as Error).message); out.push(...chunk.map(() => false)) }
  }
  return out
}
