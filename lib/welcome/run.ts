// Server-only. Welcome email scheduler. OFF unless WELCOME_EMAILS_ENABLED=true; dry run unless WELCOME_EMAILS_DRY_RUN=false.
// Dry run reads only, writes nothing and sends nothing; it returns counts (no addresses).
import { serviceClient } from '@/lib/server/admin-client'
import { isDemoUser } from '@/lib/demo'
import { SITE_URL } from '@/lib/free-tools/site-url'
import { SUPPORT_EMAIL } from '@/lib/site'
import { MAX_PER_RUN, dueStep, renderWelcome, selfSignedUp, unsubUrl, welcomeMode, type Candidate, type Step } from './core'

export type RunResult = { enabled: boolean; live: boolean; reason: string; due: Record<string, number>; sent: number; failed: number }

/** Reads every auth user page by page (Supabase caps a page at 1000). Stops on a short page, an error, or a safety cap. */
export async function listAllUsers(db: any, perPage = 1000, maxPages = 200): Promise<Candidate[]> {
  const out: Candidate[] = []
  for (let page = 1; page <= maxPages; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error('welcome: listUsers failed')
    const batch = (data?.users || []) as Candidate[]
    out.push(...batch)
    if (batch.length < perPage) break
  }
  return out
}

export async function runWelcome(now = new Date(), f: typeof fetch = fetch): Promise<RunResult> {
  const mode = welcomeMode()
  const res: RunResult = { enabled: mode.enabled, live: mode.live, reason: mode.reason, due: { '0': 0, '2': 0, '5': 0 }, sent: 0, failed: 0 }
  if (!mode.enabled || !mode.startAt) return res
  const db = serviceClient() as any
  const all = await listAllUsers(db)
  const users = all.filter((u) => selfSignedUp(u, mode.startAt, (id) => isDemoUser(id)))
  if (!users.length) return res
  const ids = users.map((u) => u.id)
  const [{ data: sends }, { data: prefs }] = await Promise.all([
    db.from('welcome_email_sends').select('user_id, step').in('user_id', ids),
    db.from('welcome_email_prefs').select('user_id, opted_out, unsub_token').in('user_id', ids),
  ])
  const done = new Map<string, Set<number>>(); for (const s of sends || []) (done.get(s.user_id) ?? done.set(s.user_id, new Set()).get(s.user_id)!).add(s.step)
  const pref = new Map<string, { opted_out: boolean; unsub_token: string }>((prefs || []).map((p: any) => [p.user_id, p]))
  const queue: { u: Candidate; step: Step }[] = []
  for (const u of users) {
    if (pref.get(u.id)?.opted_out) continue
    const step = dueStep(u.created_at, done.get(u.id) ?? new Set(), now)
    if (step !== null) { queue.push({ u, step }); res.due[String(step)]++ }
  }
  if (!mode.live) { console.log('[welcome] dry run', JSON.stringify(res.due)); return res }
  for (const { u, step } of queue.slice(0, MAX_PER_RUN)) {
    let p = pref.get(u.id)
    if (!p) { const { data: row } = await db.from('welcome_email_prefs').upsert({ user_id: u.id }, { onConflict: 'user_id', ignoreDuplicates: false }).select('opted_out, unsub_token').single(); p = row; if (!p || p.opted_out) continue }
    // Claim first (unique user_id+step): at most one email per step per user even if two runs overlap.
    const { error: claimErr } = await db.from('welcome_email_sends').insert({ user_id: u.id, step, status: 'sent' })
    if (claimErr) continue
    const m = renderWelcome(step, { site: SITE_URL, unsubUrl: unsubUrl(SITE_URL, p!.unsub_token) })
    const oneClick = unsubUrl(SITE_URL, p!.unsub_token)
    let ok = false
    try {
      const r = await f('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(15000),
        body: JSON.stringify({ from: process.env.WELCOME_EMAIL_FROM, to: [u.email], reply_to: SUPPORT_EMAIL, subject: m.subject, html: m.html, text: m.text, headers: { 'List-Unsubscribe': `<${oneClick}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }) })
      ok = r.ok
    } catch { ok = false }
    if (ok) res.sent++; else { res.failed++; await db.from('welcome_email_sends').update({ status: 'failed' }).eq('user_id', u.id).eq('step', step) }
  }
  return res
}
