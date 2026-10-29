import { NextResponse } from 'next/server'
import { clientIp, rateLimit } from '@/lib/server/rate-limit'
import { DEMO_TOKEN, cleanComment, isToken } from '@/lib/approvals/core'
import { addClientComment } from '@/lib/approvals/public'

export const dynamic = 'force-dynamic'
const H = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
/** Client comment on the latest version. Token-scoped, rate limited, no login. */
export async function POST(req: Request) {
  if (!rateLimit(`ap-comment:${clientIp(req)}`, 20, 60_000)) return NextResponse.json({ error: 'Too many comments. Try again in a minute.' }, { status: 429, headers: H })
  const b = await req.json().catch(() => null)
  const c = cleanComment(b)
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: 400, headers: H })
  if (b?.token === DEMO_TOKEN) return NextResponse.json({ ok: true, demo: true }, { headers: H })
  if (!isToken(b?.token)) return NextResponse.json({ error: 'Not found.' }, { status: 404, headers: H })
  const comment = await addClientComment(b.token, c.name, c.body)
  return comment ? NextResponse.json({ comment }, { headers: H }) : NextResponse.json({ error: 'Could not post the comment.' }, { status: 409, headers: H })
}
