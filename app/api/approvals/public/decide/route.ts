import { NextResponse } from 'next/server'
import { clientIp, rateLimit } from '@/lib/server/rate-limit'
import { DEMO_TOKEN, cleanDecision, isToken } from '@/lib/approvals/core'
import { decideLatest } from '@/lib/approvals/public'

export const dynamic = 'force-dynamic'
const H = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
/** Client Approve / Request changes on the latest version, with their name. Token-scoped, rate limited, no login. */
export async function POST(req: Request) {
  if (!rateLimit(`ap-decide:${clientIp(req)}`, 30, 60_000)) return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429, headers: H })
  const b = await req.json().catch(() => null)
  const c = cleanDecision(b)
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: 400, headers: H })
  if (b?.token === DEMO_TOKEN) return NextResponse.json({ ok: true, demo: true }, { headers: H })
  if (!isToken(b?.token)) return NextResponse.json({ error: 'Not found.' }, { status: 404, headers: H })
  const r = await decideLatest(b.token, b.version_id, c.d)
  if (r === 'ok') return NextResponse.json({ ok: true }, { headers: H })
  return NextResponse.json({ error: r === 'stale' ? 'This version was already answered, or a newer one was posted. Refresh to see it.' : 'Not found.' }, { status: r === 'stale' ? 409 : 404, headers: H })
}
