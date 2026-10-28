import { NextResponse } from 'next/server'
import { findList, subscribe } from '@/lib/emaillist/public'
import { clip, normEmail } from '@/lib/emaillist/core'
import { verifyTurnstile } from '@/lib/turnstile'
import { rateLimit } from '@/lib/server/rate-limit'

export async function POST(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
  const b = await req.json().catch(() => null)
  if (b?.website) return NextResponse.json({ state: 'check_email' }) // honeypot
  const slug = clip(b?.slug, 40).toLowerCase()
  if (!rateLimit(`el-sub-ip:${ip}`, 6, 60_000) || !rateLimit(`el-sub-list:${slug}`, 60, 3_600_000)) return NextResponse.json({ error: 'Too many signups. Please try again in a little while.' }, { status: 429 })
  const email = normEmail(b?.email)
  if (!email) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  if (b?.consent !== true) return NextResponse.json({ error: 'Please tick the box to agree to get emails.' }, { status: 400 })
  if (!(await verifyTurnstile(b?.turnstileToken, ip))) return NextResponse.json({ error: 'Please complete the check and try again.' }, { status: 400 })
  const list = await findList(slug)
  if (!list) return NextResponse.json({ error: 'This email list is not available.' }, { status: 404 })
  try {
    const where = b?.embed ? 'embedded signup form' : 'signup page'
    const r = await subscribe(list, email, clip(b?.name, 200) || null, `Ticked the consent box on the ${where} (${new Date().toISOString().slice(0, 10)})`)
    return NextResponse.json(r)
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
