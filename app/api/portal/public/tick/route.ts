import { NextResponse } from 'next/server'
import { clientIp, rateLimit } from '@/lib/server/rate-limit'
import { DEMO_TOKEN, isToken } from '@/lib/portal/core'
import { tickTask } from '@/lib/portal/public'

export const dynamic = 'force-dynamic'
const H = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
/** Client ticks one of their own checklist steps. Token-scoped, rate limited, no login. */
export async function POST(req: Request) {
  if (!rateLimit(`pt-tick:${clientIp(req)}`, 60, 60_000)) return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429, headers: H })
  const b = await req.json().catch(() => null)
  if (b?.token === DEMO_TOKEN) return NextResponse.json({ ok: true, demo: true }, { headers: H })
  if (!isToken(b?.token) || typeof b?.done !== 'boolean') return NextResponse.json({ error: 'Not found.' }, { status: 404, headers: H })
  const ok = await tickTask(b.token, b.task_id, b.done)
  return ok ? NextResponse.json({ ok: true }, { headers: H }) : NextResponse.json({ error: 'Not found.' }, { status: 404, headers: H })
}
