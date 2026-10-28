// Public (no sign-in) email list operations. Service role, narrow inputs, rate-limited by the routes.
import { serviceClient } from '@/lib/server/admin-client'
import { demoUserIds, isDemoUser } from '@/lib/demo'
import { demoSettings } from './demo'
import { SITE, confirmUrl, renderConfirm, sendingEnvEnabled, unsubscribeUrl, type Settings } from './core'
import { fromHeader, resendConfigured, sendBatch } from './send'

export type PublicList = { userId: string; slug: string; title: string; blurb: string; fromName: string; doubleOptIn: boolean; demo: boolean }
/** A list page exists only if the owner set a slug and currently has Email list (or All Access). */
export async function findList(slug: string): Promise<PublicList | null> {
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return null
  const db: any = serviceClient()
  const { data: s } = await db.from('el_settings').select('user_id,slug,from_name,page_title,page_blurb,double_opt_in').eq('slug', slug).maybeSingle()
  if (!s) {
    // The demo account's sample list page: always demo (signups are never saved, nothing is sent).
    const d = demoSettings(); const demoId = [...demoUserIds()][0]
    return slug === d.slug && demoId ? { userId: demoId, slug, title: d.page_title || 'Join the list', blurb: d.page_blurb || '', fromName: d.from_name || 'Demo', doubleOptIn: true, demo: true } : null
  }
  const { data: ok } = await db.rpc('el_has_access', { uid: s.user_id })
  const demo = isDemoUser(s.user_id)
  if (ok !== true && !demo) return null
  const fromName = s.from_name || 'this creator'
  return { userId: s.user_id, slug: s.slug, title: s.page_title || `Join ${fromName}'s email list`, blurb: s.page_blurb || '', fromName, doubleOptIn: s.double_opt_in, demo }
}

/** Can a confirmation email go out right now for this owner? (Same switches as broadcasts.) */
async function canSendConfirm(db: any, userId: string, s: Settings & { user_id?: string }) {
  if (!sendingEnvEnabled() || !resendConfigured() || !s.sending_enabled || !s.from_name || !s.mailing_address || isDemoUser(userId)) return false
  const { count } = await db.from('el_sends').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'sent').gte('created_at', new Date(Date.now() - 86_400_000).toISOString())
  return (count || 0) < s.daily_cap
}

export type SubscribeResult = { state: 'subscribed' | 'check_email' | 'pending_no_email' | 'demo' }
export async function subscribe(list: PublicList, email: string, name: string | null, detail: string): Promise<SubscribeResult> {
  if (list.demo) return { state: 'demo' }
  const db: any = serviceClient()
  const { data: existing } = await db.from('el_subscribers').select('id,status,unsub_token').eq('user_id', list.userId).eq('email', email).maybeSingle()
  // Already subscribed: same answer as a new signup, so the form can't be used to probe who is on a list.
  if (existing?.status === 'subscribed') return { state: list.doubleOptIn ? 'check_email' : 'subscribed' }
  const now = new Date().toISOString()
  const base = { name, source: 'form', consent_at: now, consent_detail: detail.slice(0, 300), updated_at: now }
  const row = list.doubleOptIn
    ? { ...base, status: 'pending', consent: 'double_opt_in', confirm_token: crypto.randomUUID(), confirmed_at: null, unsubscribed_at: null }
    : { ...base, status: 'subscribed', consent: 'single_opt_in', confirm_token: null, confirmed_at: now, unsubscribed_at: null }
  const q = existing
    ? db.from('el_subscribers').update(row).eq('id', existing.id).select('id,unsub_token,confirm_token').single()
    : db.from('el_subscribers').insert({ ...row, user_id: list.userId, email }).select('id,unsub_token,confirm_token').single()
  const { data: saved, error } = await q
  if (error || !saved) throw new Error('subscribe failed')
  if (!list.doubleOptIn) return { state: 'subscribed' }
  const { data: s } = await db.from('el_settings').select('from_name,mailing_address,reply_to,sending_enabled,daily_cap').eq('user_id', list.userId).maybeSingle()
  if (!s || !(await canSendConfirm(db, list.userId, s))) return { state: 'pending_no_email' }
  const r = renderConfirm(s, confirmUrl(saved.confirm_token), unsubscribeUrl(saved.unsub_token))
  const [ok] = await sendBatch([{ ...r, to: email, unsubUrl: unsubscribeUrl(saved.unsub_token), oneClickUrl: `${SITE}/api/emaillist/unsubscribe?t=${saved.unsub_token}` }], fromHeader(s.from_name), s.reply_to)
  await db.from('el_sends').insert({ user_id: list.userId, subscriber_id: saved.id, kind: 'confirm', status: ok ? 'sent' : 'failed' })
  return { state: ok ? 'check_email' : 'pending_no_email' }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export async function confirmToken(token: string): Promise<{ ok: boolean; fromName?: string }> {
  if (!UUID.test(token)) return { ok: false }
  const db: any = serviceClient()
  const now = new Date().toISOString()
  const { data } = await db.from('el_subscribers').update({ status: 'subscribed', confirmed_at: now, confirm_token: null, updated_at: now }).eq('confirm_token', token).eq('status', 'pending').select('user_id').maybeSingle()
  if (!data) return { ok: false }
  const { data: s } = await db.from('el_settings').select('from_name').eq('user_id', data.user_id).maybeSingle()
  return { ok: true, fromName: s?.from_name || undefined }
}

export async function unsubscribeToken(token: string, broadcastId?: string | null): Promise<{ ok: boolean; fromName?: string }> {
  if (!UUID.test(token)) return { ok: false }
  const db: any = serviceClient()
  const { data: sub } = await db.from('el_subscribers').select('id,user_id,status').eq('unsub_token', token).maybeSingle()
  if (!sub) return { ok: false }
  if (sub.status !== 'unsubscribed') {
    const now = new Date().toISOString()
    await db.from('el_subscribers').update({ status: 'unsubscribed', unsubscribed_at: now, confirm_token: null, unsub_broadcast_id: broadcastId && UUID.test(broadcastId) ? broadcastId : null, updated_at: now }).eq('id', sub.id)
  }
  const { data: s } = await db.from('el_settings').select('from_name').eq('user_id', sub.user_id).maybeSingle()
  return { ok: true, fromName: s?.from_name || undefined }
}
