// Delivery email through Resend (same account and verified domain as Booking). Server-only.
// Sends ONLY when DOWNLOADS_SEND_ENABLED is 1/true AND the seller turned on email delivery AND RESEND_API_KEY is set. Never throws.
import { sendingEnvEnabled, type DeliveryMail } from './core'

export const DEFAULT_DL_FROM = 'downloads@saasnation.site'
export const resendConfigured = () => !!process.env.RESEND_API_KEY
export function deliveryFrom(storeName: string | null, env: Record<string, string | undefined> = process.env) {
  const addr = (env.DOWNLOADS_EMAIL_FROM || DEFAULT_DL_FROM).replace(/^.*<([^>]+)>.*$/, '$1').trim()
  const name = (storeName || 'SaaS Nation').replace(/["<>\r\n\\]/g, '').trim().slice(0, 60) || 'SaaS Nation'
  return `"${name} via SaaS Nation" <${addr}>`
}
export function deliveryGate(g: { demo: boolean; sellerOn: boolean; env?: Record<string, string | undefined> }): { ok: boolean; reason: string } {
  if (g.demo) return { ok: false, reason: 'demo' }
  if (!g.sellerOn) return { ok: false, reason: 'seller_off' }
  if (!sendingEnvEnabled(g.env) || !(g.env ? !!g.env.RESEND_API_KEY : resendConfigured())) return { ok: false, reason: 'platform_off' }
  return { ok: true, reason: 'ok' }
}
export async function sendDelivery(to: string, m: DeliveryMail, from: string, replyTo: string | null, f: typeof fetch = fetch): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key || !sendingEnvEnabled()) return false
  try {
    const res = await f('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject: m.subject, html: m.html, text: m.text, ...(replyTo ? { reply_to: replyTo } : {}) }), signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) console.error('[downloads] delivery email failed', res.status)
    return res.ok
  } catch (e) { console.error('[downloads] delivery email error', (e as Error).message); return false }
}
