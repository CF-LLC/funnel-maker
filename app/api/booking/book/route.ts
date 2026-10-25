import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/server/admin-client'
import { rateLimit, clientIp } from '@/lib/server/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'
import { isDemoUser } from '@/lib/demo'
import { blockFor, bookSchema } from '@/lib/booking/core'
import { getBookingOwner, openSlots } from '@/lib/booking/public'
import { isValidTimeZone } from '@/lib/booking/core'
import { emailConfigured } from '@/lib/booking/email'
import { notifyBookingCreated } from '@/lib/booking/notify'

export const dynamic = 'force-dynamic'

// Public booking: rate limited, Turnstile-checked, only real open slots; the database exclusion constraint
// is the final guard against double booking. Emails are best effort (only with RESEND_API_KEY) and never block a booking.
export async function POST(request: Request) {
  const ip = clientIp(request)
  if (!rateLimit(`book:${ip}`, 8, 60_000) || !rateLimit(`book-h:${ip}`, 20, 3_600_000)) return NextResponse.json({ error: 'Too many requests, try again later' }, { status: 429 })
  const body = await request.json().catch(() => null)
  const v = bookSchema.safeParse(body)
  if (!v.success) return NextResponse.json({ error: v.error.issues[0]?.message || 'Invalid request' }, { status: 400 })
  // Abuse guard: the booker's address can receive at most 3 confirmations an hour from this form.
  if (!rateLimit(`book-email:${v.data.email.toLowerCase()}`, 3, 3_600_000)) return NextResponse.json({ error: 'Too many bookings for this email, try again later' }, { status: 429 })
  const owner = await getBookingOwner(v.data.handle)
  const type = owner?.types.find((t) => t.slug === v.data.type)
  if (!owner || !type) return NextResponse.json({ error: 'This page is unavailable.' }, { status: 404 })
  const start = new Date(v.data.start).toISOString()
  const demo = isDemoUser(owner.user_id)
  if (!demo && !(await verifyTurnstile((body as any)?.turnstileToken, ip))) return NextResponse.json({ error: 'Bot check failed, please try again' }, { status: 403 })
  const slots = await openSlots(owner, type)
  if (!slots.some((s) => s.start === start)) return NextResponse.json({ error: 'That time is no longer available. Please pick another.' }, { status: 409 })
  const range = blockFor(start, type)
  if (demo) return NextResponse.json({ ok: true, demo: true, id: 'demo', ...range })
  const { data, error } = await (serviceClient() as any).from('bk_bookings').insert({
    user_id: owner.user_id, type_id: type.id, ...range, name: v.data.name, email: v.data.email, notes: v.data.notes || null, booker_tz: isValidTimeZone(v.data.tz) ? v.data.tz : null,
  }).select('id').single()
  if (error) {
    if (error.code === '23P01') return NextResponse.json({ error: 'That time was just booked. Please pick another.' }, { status: 409 })
    return NextResponse.json({ error: 'Could not book, please try again' }, { status: 500 })
  }
  const emailed = emailConfigured() ? await notifyBookingCreated(data.id) : false
  return NextResponse.json({ ok: true, id: data.id, emailed, ...range })
}
