import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/server/admin-client'
import { verifyTurnstile } from '@/lib/turnstile'
import { rateLimit, clientIp } from '@/lib/server/rate-limit'
import { UPDATES_CONSENT_TEXT, cleanSourcePage, normalizeSignupEmail } from '@/lib/updates/signup'

// Homepage "new tools" list. Stores the signup only; sends NO email of any kind.
export async function POST(req: Request) {
  const ip = clientIp(req)
  const b = await req.json().catch(() => null)
  if (b?.company) return NextResponse.json({ state: 'subscribed' }) // honeypot: pretend success, store nothing
  if (!rateLimit(`upd-ip:${ip}`, 5, 60_000) || !rateLimit('upd-all', 300, 3_600_000)) return NextResponse.json({ error: 'Too many signups. Please try again in a little while.' }, { status: 429 })
  const email = normalizeSignupEmail(b?.email)
  if (!email) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  if (!(await verifyTurnstile(b?.turnstileToken, ip))) return NextResponse.json({ error: 'Please complete the check and try again.' }, { status: 400 })
  try {
    const db = serviceClient()
    const now = new Date().toISOString()
    const row = { email, source_page: cleanSourcePage(b?.source), consent_text: UPDATES_CONSENT_TEXT, consented_at: now, unsubscribed_at: null, updated_at: now }
    const { data: existing, error: selErr } = await db.from('tool_updates_signups').select('id, unsubscribed_at').eq('email', email).maybeSingle()
    if (selErr) throw selErr
    if (!existing) {
      const { error } = await db.from('tool_updates_signups').insert(row)
      if (error && error.code !== '23505') throw error // 23505 = raced duplicate; already on the list
    } else if (existing.unsubscribed_at) {
      const { error } = await db.from('tool_updates_signups').update(row).eq('id', existing.id) // re-consented
      if (error) throw error
    }
    // Same answer whether new or existing, so the form can't be used to check who signed up.
    return NextResponse.json({ state: 'subscribed' })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
