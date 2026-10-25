import { serviceClient } from '@/lib/server/admin-client'
import { HANDLE_RE, normalizeHandle } from '@/lib/linkinbio/core'
import { generateSlots, isValidTimeZone, weeklySchema, type Slot, type Window } from '@/lib/booking/core'

export type PublicType = { id: string; slug: string; name: string; description: string | null; duration_min: number; buffer_before: number; buffer_after: number; min_notice_min: number; max_days_ahead: number; location: string | null }
export type BookingOwner = { user_id: string; handle: string; display_name: string; timezone: string; weekly: Window[]; types: PublicType[] }

const TYPE_COLS = 'id, slug, name, description, duration_min, buffer_before, buffer_after, min_notice_min, max_days_ahead, location'

/** Owner of a handle with a published booking page and booking (or all) access. Null otherwise (pages 404). */
export async function getBookingOwner(raw: string): Promise<BookingOwner | null> {
  const handle = normalizeHandle(raw)
  if (!HANDLE_RE.test(handle)) return null
  const db = serviceClient() as any
  const { data: prof } = await db.from('lib_profiles').select('user_id, handle, display_name').eq('handle', handle).maybeSingle()
  if (!prof) return null
  const { data: ok } = await db.rpc('bk_has_access', { uid: prof.user_id })
  if (ok !== true) return null
  const [{ data: s }, { data: av }, { data: types }] = await Promise.all([
    db.from('bk_settings').select('timezone, published').eq('user_id', prof.user_id).maybeSingle(),
    db.from('bk_availability').select('weekly').eq('user_id', prof.user_id).maybeSingle(),
    db.from('bk_types').select(TYPE_COLS).eq('user_id', prof.user_id).eq('active', true).order('created_at'),
  ])
  if (!s?.published) return null
  const weekly = weeklySchema.safeParse(av?.weekly ?? [])
  return {
    user_id: prof.user_id, handle: prof.handle, display_name: prof.display_name || '',
    timezone: isValidTimeZone(s.timezone) ? s.timezone : 'America/Chicago',
    weekly: weekly.success ? weekly.data : [], types: types || [],
  }
}

/** Open slots for one meeting type, excluding confirmed bookings. */
export async function openSlots(owner: BookingOwner, type: PublicType, now = Date.now()): Promise<Slot[]> {
  const db = serviceClient() as any
  const until = new Date(now + (type.max_days_ahead + 2) * 86_400_000).toISOString()
  const { data: blocks } = await db.from('bk_bookings').select('block_start, block_end')
    .eq('user_id', owner.user_id).eq('status', 'confirmed').lt('block_start', until).gt('block_end', new Date(now - 86_400_000).toISOString())
  return generateSlots({ tz: owner.timezone, weekly: owner.weekly, type, blocks: blocks || [], now })
}
