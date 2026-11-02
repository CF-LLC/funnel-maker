import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/server/admin-client'
import { verifyTurnstile } from '@/lib/turnstile'
import { rateLimit, clientIp } from '@/lib/server/rate-limit'
import { CAPTURE_CONSENT_TEXT, cleanSourceTool, normalizeEmail } from '@/lib/capture/core'
import { recordSiteEvent } from '@/lib/site-events/server'

export const runtime = 'nodejs'

// Optional email box under each free tool. Stores the email + tool + consent text; sends NO email of any kind.
export async function POST(req: Request) {
  const ip = clientIp(req)
  const b = await req.json().catch(() => null)
  if (b?.company) return NextResponse.json({ state: 'saved' }) // honeypot
  if (!rateLimit(`fte-ip:${ip}`, 5, 60_000) || !rateLimit('fte-all', 300, 3_600_000)) return NextResponse.json({ error: 'Too many tries. Please wait a little and try again.' }, { status: 429 })
  const email = normalizeEmail(b?.email)
  if (!email) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  const tool = cleanSourceTool(b?.tool)
  if (!tool) return NextResponse.json({ error: 'Unknown tool.' }, { status: 400 })
  if (b?.consent !== true) return NextResponse.json({ error: 'Please tick the box to agree.' }, { status: 400 })
  if (!(await verifyTurnstile(b?.turnstileToken, ip))) return NextResponse.json({ error: 'Please complete the check and try again.' }, { status: 400 })
  try {
    const db = serviceClient()
    const now = new Date().toISOString()
    const { data: existing, error: selErr } = await db.from('free_tool_emails').select('id, unsubscribed').eq('email', email).eq('source_tool', tool).maybeSingle()
    if (selErr) throw selErr
    let isNew = false
    if (!existing) {
      const { error } = await db.from('free_tool_emails').insert({ email, source_tool: tool, consent_text: CAPTURE_CONSENT_TEXT, consented_at: now })
      if (error && error.code !== '23505') throw error
      isNew = !error
    } else if (existing.unsubscribed) {
      const { error } = await db.from('free_tool_emails').update({ unsubscribed: false, consent_text: CAPTURE_CONSENT_TEXT, consented_at: now, updated_at: now }).eq('id', existing.id)
      if (error) throw error
    }
    if (isNew) await recordSiteEvent({ event: 'email_captured', path: `/free-tools/${tool}`, tool })
    return NextResponse.json({ state: 'saved' }) // same answer for new and existing
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
