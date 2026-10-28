import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { hasAccess } from '@/lib/access'
import { isDemoUser } from '@/lib/demo'

export const DEMO_MSG = 'This is the demo account, so nothing is saved or sent.'
/** Auth → access → (for writes) demo. Returns the session client so RLS applies to every query. */
export async function elGuard(write: boolean) {
  const db: any = await createServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { err: NextResponse.json({ error: 'Please sign in again.' }, { status: 401 }) }
  const demo = isDemoUser(user.id)
  if (!demo && !(await hasAccess(user, 'emaillist'))) return { err: NextResponse.json({ error: 'Email list is not on your plan yet.' }, { status: 403 }) }
  if (write && demo) return { err: NextResponse.json({ error: DEMO_MSG, demo: true }, { status: 403 }) }
  return { db, user, demo }
}
export const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
export const SUB_COLS = 'id,email,name,tags,status,source,consent,consent_at,consent_detail,created_at,confirmed_at,unsubscribed_at,unsub_broadcast_id'
export const SETTINGS_COLS = 'slug,from_name,reply_to,mailing_address,page_title,page_blurb,double_opt_in,daily_cap,sending_enabled'
export const BROADCAST_COLS = 'id,subject,preheader,body,tag,status,recipients,sent_count,failed_count,sent_at,created_at,updated_at'
