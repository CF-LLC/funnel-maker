import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase'
import { rateLimit } from '@/lib/server/rate-limit'
import { notifyBookingCancelled } from '@/lib/booking/notify'

export const dynamic = 'force-dynamic'

// Host cancels with their own session (RLS + bk_booking_rules allow status -> cancelled only), then the booker gets one notice.
export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
  if (!rateLimit(`bk-cancel:${user.id}`, 30, 3_600_000)) return NextResponse.json({ error: 'Too many requests, try again later' }, { status: 429 })
  const v = z.object({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null))
  if (!v.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { data, error } = await (supabase as any).from('bk_bookings').update({ status: 'cancelled' }).eq('id', v.data.id).eq('user_id', user.id).eq('status', 'confirmed').select('id')
  if (error || !data?.length) return NextResponse.json({ error: 'Could not cancel the booking.' }, { status: 400 })
  const emailed = await notifyBookingCancelled(v.data.id)
  return NextResponse.json({ ok: true, emailed })
}
