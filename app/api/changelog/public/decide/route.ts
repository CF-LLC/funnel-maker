import { NextResponse } from 'next/server'
import { clientIp, rateLimit } from '@/lib/server/rate-limit'
import { DEMO_TOKEN, cleanDecision, isToken } from '@/lib/changelog/core'
import { decide } from '@/lib/changelog/public'

export const dynamic = 'force-dynamic'
const H = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
/** Client answers a request: "OK, add it" or "No thanks", with their name and an optional note. Token-scoped, rate limited, no login. */
export async function POST(req: Request) {
  if (!rateLimit(`cl-decide:${clientIp(req)}`, 30, 60_000)) return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429, headers: H })
  const b = await req.json().catch(() => null)
  const c = cleanDecision(b)
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: 400, headers: H })
  if (b?.token === DEMO_TOKEN) return NextResponse.json({ ok: true, demo: true }, { headers: H })
  if (!isToken(b?.token)) return NextResponse.json({ error: 'Not found.' }, { status: 404, headers: H })
  const ok = await decide(b.token, b.request_id, c.d)
  return ok ? NextResponse.json({ ok: true }, { headers: H }) : NextResponse.json({ error: 'This request was already answered or no longer exists.' }, { status: 409, headers: H })
}
