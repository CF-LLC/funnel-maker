// Server-only. Writes acquisition events with the service role (table is locked to anon/authenticated).
import { cookies } from 'next/headers'
import { serviceClient } from '@/lib/server/admin-client'
import { VISITOR_COOKIE, isVisitorId } from './core'

/** Link the signed-in user to their anonymous visitor id once (unique per user). Never throws. */
export async function recordSignupOnce(userId: string): Promise<void> {
  try {
    const vid = (await cookies()).get(VISITOR_COOKIE)?.value
    if (!isVisitorId(vid)) return
    const { error } = await serviceClient().from('acquisition_events').insert({ visitor_id: vid, kind: 'signup', user_id: userId })
    if (error && error.code !== '23505') return
  } catch { /* tracking must never break the dashboard */ }
}
