import { NextResponse } from 'next/server'
import { unsubscribeToken } from '@/lib/emaillist/public'
import { rateLimit } from '@/lib/server/rate-limit'

/** JSON from the unsubscribe page, or RFC 8058 one-click POST from mail apps (?t=token&b=broadcast). */
export async function POST(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
  if (!rateLimit(`el-unsub:${ip}`, 30, 60_000)) return NextResponse.json({ ok: false }, { status: 429 })
  const u = new URL(req.url)
  let token = u.searchParams.get('t') || ''; let b = u.searchParams.get('b')
  if (!token && (req.headers.get('content-type') || '').includes('json')) { const j = await req.json().catch(() => null); token = String(j?.token || ''); b = j?.b ? String(j.b) : null }
  return NextResponse.json(await unsubscribeToken(token, b))
}
