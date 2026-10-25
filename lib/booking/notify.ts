import { serviceClient } from '@/lib/server/admin-client'
import { isDemoUser } from '@/lib/demo'
import { isValidTimeZone } from '@/lib/booking/core'
import { emailConfigured, sendBookingCancelled, sendBookingCreated, type BookingMail } from '@/lib/booking/email'

const COLS = 'id, user_id, type_id, starts_at, ends_at, name, email, notes, status, booker_tz, confirmation_sent_at, cancel_notice_sent_at'

async function load(id: string): Promise<BookingMail | null> {
  const db = serviceClient() as any
  const { data: b } = await db.from('bk_bookings').select(COLS).eq('id', id).maybeSingle()
  if (!b || isDemoUser(b.user_id)) return null
  const [{ data: t }, { data: s }, { data: p }, { data: u }] = await Promise.all([
    db.from('bk_types').select('name, slug, duration_min, location').eq('id', b.type_id).maybeSingle(),
    db.from('bk_settings').select('timezone').eq('user_id', b.user_id).maybeSingle(),
    db.from('lib_profiles').select('handle, display_name').eq('user_id', b.user_id).maybeSingle(),
    db.auth.admin.getUserById(b.user_id),
  ])
  const hostEmail: string | undefined = u?.user?.email
  if (!t || !hostEmail) return null
  const hostTz = isValidTimeZone(s?.timezone) ? s.timezone : 'America/Chicago'
  return {
    id: b.id, start: b.starts_at, end: b.ends_at, typeName: t.name, durationMin: t.duration_min, location: t.location,
    hostName: p?.display_name || (p?.handle ? `@${p.handle}` : 'your host'), hostEmail, hostTz, handle: p?.handle || '', typeSlug: t.slug,
    bookerName: b.name, bookerEmail: b.email, bookerTz: isValidTimeZone(b.booker_tz) ? b.booker_tz : hostTz, notes: b.notes,
  }
}

/** Claim a once-only flag; true only for the first caller. */
async function claim(id: string, col: 'confirmation_sent_at' | 'cancel_notice_sent_at', extra: Record<string, string> = {}) {
  let q = (serviceClient() as any).from('bk_bookings').update({ [col]: new Date().toISOString() }).eq('id', id).is(col, null)
  for (const [k, v] of Object.entries(extra)) q = q.eq(k, v)
  const { data } = await q.select('id')
  return Array.isArray(data) && data.length === 1
}

/** Best effort, never throws. Exactly one confirmation per booking. */
export async function notifyBookingCreated(id: string): Promise<boolean> {
  try {
    if (!emailConfigured()) return false
    const m = await load(id)
    if (!m || !(await claim(id, 'confirmation_sent_at'))) return false
    const r = await sendBookingCreated(m)
    return r.booker
  } catch (e) { console.error('[booking-email] created', (e as Error).message); return false }
}

export async function notifyBookingCancelled(id: string): Promise<boolean> {
  try {
    if (!emailConfigured()) return false
    const m = await load(id)
    if (!m || Date.parse(m.end) < Date.now() || !(await claim(id, 'cancel_notice_sent_at', { status: 'cancelled' }))) return false
    return await sendBookingCancelled(m)
  } catch (e) { console.error('[booking-email] cancelled', (e as Error).message); return false }
}
