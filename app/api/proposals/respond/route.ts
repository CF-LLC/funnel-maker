import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/server/admin-client'
import { rateLimit, clientIp } from '@/lib/server/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'
import { getPublicProposal } from '@/lib/proposals/public'
import { isDemoUser } from '@/lib/demo'
import { canRespond, respondSchema, todayChicago } from '@/lib/proposals/core'

export const dynamic = 'force-dynamic'
const unavailable = () => NextResponse.json({ error: 'This page is unavailable.' }, { status: 404 })

// Public accept/decline: rate limited, Turnstile-checked, only from 'sent' and before expiry. No emails, no payment.
export async function POST(request: Request) {
  const ip = clientIp(request)
  if (!rateLimit(`proposal:${ip}`, 10, 60_000)) return NextResponse.json({ error: 'Too many requests, try again later' }, { status: 429 })
  if (Number(request.headers.get('content-length') || 0) > 5_000) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const v = respondSchema.safeParse(body)
  if (!v.success) return NextResponse.json({ error: v.error.issues[0]?.message || 'Invalid request' }, { status: 400 })
  if (!(await verifyTurnstile(body.turnstileToken, ip))) return NextResponse.json({ error: 'Bot check failed, please try again' }, { status: 403 })
  const p = await getPublicProposal(v.data.handle, v.data.id)
  if (!p) return unavailable()
  if (isDemoUser(p.user_id)) return NextResponse.json({ ok: true, demo: true })
  const today = todayChicago()
  if (!canRespond(p, today)) return NextResponse.json({ error: 'This proposal can no longer be answered.' }, { status: 409 })
  const accept = v.data.action === 'accept'
  // Conditional update: only a still-sent, unexpired proposal changes (no double responses).
  let q = (serviceClient() as any).from('prp_proposals')
    .update({ status: accept ? 'accepted' : 'declined', accepted_name: accept ? v.data.name : null, responded_at: new Date().toISOString() })
    .eq('id', p.id).eq('user_id', p.user_id).eq('status', 'sent')
  q = p.expires_on ? q.gte('expires_on', today) : q.is('expires_on', null)
  const { data, error } = await q.select('id')
  if (error) return NextResponse.json({ error: 'Could not save, please try again' }, { status: 500 })
  if (!data?.length) return NextResponse.json({ error: 'This proposal can no longer be answered.' }, { status: 409 })
  return NextResponse.json({ ok: true })
}
