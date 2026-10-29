import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/server/admin-client'
import { rateLimit, clientIp } from '@/lib/server/rate-limit'
import { isUuid } from '@/lib/updates/signup'

// Marks a "new tools" signup as unsubscribed by its private token (for future email footers). POST only.
export async function POST(req: Request) {
  if (!rateLimit(`upd-unsub:${clientIp(req)}`, 10, 60_000)) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
  const b = await req.json().catch(() => null)
  if (!isUuid(b?.token)) return NextResponse.json({ error: 'Invalid link.' }, { status: 400 })
  try {
    const { error } = await serviceClient().from('tool_updates_signups').update({ unsubscribed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('unsubscribe_token', b.token).is('unsubscribed_at', null)
    if (error) throw error
    return NextResponse.json({ state: 'unsubscribed' })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
