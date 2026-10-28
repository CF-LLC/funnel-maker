import { NextResponse } from 'next/server'
import { elGuard, bad, BROADCAST_COLS } from '@/lib/emaillist/guard'
import { loadSettings, sentLast24h } from '@/lib/emaillist/load'
import { renderBroadcast, sendingEnvEnabled, SITE } from '@/lib/emaillist/core'
import { fromHeader, resendConfigured, sendBatch } from '@/lib/emaillist/send'
import { serviceClient } from '@/lib/server/admin-client'
import { rateLimit } from '@/lib/server/rate-limit'

/** Sends one preview copy to the signed-in account's own email address only. Same gates as a real send (minus recipients). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await elGuard(false); if (g.err) return g.err
  if (g.demo) return NextResponse.json({ error: 'This is the demo account, so nothing is sent.', code: 'demo' }, { status: 403 })
  if (!/^[0-9a-f-]{36}$/i.test(id)) return bad('Not found.', 404)
  const own = g.user.email as string | undefined
  if (!own) return bad('Your account has no email address.')
  const { data: bc } = await g.db.from('el_broadcasts').select(BROADCAST_COLS).eq('id', id).maybeSingle()
  if (!bc) return bad('Not found.', 404)
  const s = await loadSettings()
  if (!bc.subject.trim() || !bc.body.trim()) return bad('Add a subject and a message first.')
  if (!s.from_name || !s.mailing_address) return bad('Add your sender name and mailing address in Settings first.')
  if (!s.sending_enabled) return NextResponse.json({ error: 'Demo mode is on in Settings, so nothing is sent.', code: 'demo' }, { status: 403 })
  if (!sendingEnvEnabled() || !resendConfigured()) return NextResponse.json({ error: 'Sending is not switched on for SaaS Nation yet.', code: 'disabled' }, { status: 403 })
  if ((await sentLast24h(g.user.id)) + 1 > s.daily_cap) return bad('You have reached your daily limit.')
  if (!rateLimit(`el-test:${g.user.id}`, 5, 600_000)) return bad('Too many test emails. Try again in a few minutes.', 429)
  const unsubUrl = `${SITE}/email-list/settings#test-preview`
  const r = renderBroadcast({ ...bc, subject: `[Test] ${bc.subject}` }, s, unsubUrl)
  const [ok] = await sendBatch([{ ...r, to: own, unsubUrl, oneClickUrl: unsubUrl }], fromHeader(s.from_name), s.reply_to)
  await (serviceClient() as any).from('el_sends').insert({ user_id: g.user.id, broadcast_id: id, kind: 'test', status: ok ? 'sent' : 'failed' })
  return ok ? NextResponse.json({ ok: true, to: own }) : bad('The test email could not be sent.', 502)
}
