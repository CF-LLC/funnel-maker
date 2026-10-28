import { NextResponse } from 'next/server'
import { elGuard, bad, BROADCAST_COLS } from '@/lib/emaillist/guard'
import { loadSettings, sentLast24h } from '@/lib/emaillist/load'
import { recipientsFor, renderBroadcast, sendGate, sendingEnvEnabled, unsubscribeUrl, SITE } from '@/lib/emaillist/core'
import { fromHeader, resendConfigured, sendBatch } from '@/lib/emaillist/send'
import { serviceClient } from '@/lib/server/admin-client'
import { rateLimit } from '@/lib/server/rate-limit'

/** Sends a broadcast. Only ever runs from an explicit click in the app plus typing SEND; see sendGate() for every check. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await elGuard(false); if (g.err) return g.err
  if (!/^[0-9a-f-]{36}$/i.test(id)) return bad('Not found.', 404)
  const b = await req.json().catch(() => null)
  const { data: bc } = await g.db.from('el_broadcasts').select(BROADCAST_COLS).eq('id', id).maybeSingle()
  if (!bc && !g.demo) return bad('Not found.', 404)
  const settings = g.demo ? null : await loadSettings()
  const subs: { id: string; email: string; status: string; tags: string[]; unsub_token: string }[] = []
  if (!g.demo) {
    for (let from = 0; from < 50000; from += 1000) {
      const { data } = await g.db.from('el_subscribers').select('id,email,status,tags,unsub_token').eq('status', 'subscribed').range(from, from + 999)
      subs.push(...(data || [])); if (!data || data.length < 1000) break
    }
  }
  const to = recipientsFor(subs as any, bc?.tag ?? null) as typeof subs
  const gate = sendGate({
    demo: g.demo, envEnabled: sendingEnvEnabled(), resendConfigured: resendConfigured(), settings,
    sentLast24h: g.demo ? 0 : await sentLast24h(g.user.id), recipients: to.length, broadcast: bc ?? { status: 'draft', subject: 'x', body: 'x' }, confirmText: b?.confirm,
  })
  if (!gate.ok) return NextResponse.json({ error: gate.reason, code: gate.code }, { status: gate.code === 'demo' || gate.code === 'disabled' ? 403 : 400 })
  if (!rateLimit(`el-send:${g.user.id}`, 3, 60_000)) return bad('Please wait a minute before sending again.', 429)

  const svc: any = serviceClient()
  // Claim the draft atomically so a double click can't send twice.
  const { data: claimed } = await svc.from('el_broadcasts').update({ status: 'sending', recipients: to.length, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', g.user.id).eq('status', 'draft').select('id').maybeSingle()
  if (!claimed) return bad('This broadcast is already being sent.', 409)

  const mails = to.map((s) => {
    const unsubUrl = unsubscribeUrl(s.unsub_token, id)
    return { ...renderBroadcast(bc, settings!, unsubUrl), to: s.email, unsubUrl, oneClickUrl: `${SITE}/api/emaillist/unsubscribe?t=${s.unsub_token}&b=${id}` }
  })
  const results = await sendBatch(mails, fromHeader(settings!.from_name), settings!.reply_to)
  const sent = results.filter(Boolean).length
  const rows = to.map((s, i) => ({ user_id: g.user.id, broadcast_id: id, subscriber_id: s.id, kind: 'broadcast', status: results[i] ? 'sent' : 'failed' }))
  for (let i = 0; i < rows.length; i += 1000) await svc.from('el_sends').insert(rows.slice(i, i + 1000))
  await svc.from('el_broadcasts').update({ status: sent ? 'sent' : 'failed', sent_count: sent, failed_count: to.length - sent, sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id)
  return NextResponse.json({ ok: true, sent, failed: to.length - sent })
}
