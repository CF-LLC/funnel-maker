import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { hasAccess } from '@/lib/access'
import { isDemoUser } from '@/lib/demo'

export const DEMO_MSG = 'This is the demo account, so nothing is saved.'
/** Auth → access → (for writes) demo. Returns the session client so RLS applies to every query. */
export async function dlGuard(write: boolean) {
  const db: any = await createServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { err: NextResponse.json({ error: 'Please sign in again.' }, { status: 401 }) }
  const demo = isDemoUser(user.id)
  if (!demo && !(await hasAccess(user, 'downloads'))) return { err: NextResponse.json({ error: 'Digital downloads is not on your plan yet.' }, { status: 403 }) }
  if (write && demo) return { err: NextResponse.json({ error: DEMO_MSG, demo: true }, { status: 403 }) }
  return { db, user, demo }
}
export const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
export const STORE_COLS = 'slug,title,blurb,accent,support_email,email_delivery'
export const PRODUCT_COLS = 'id,slug,title,subtitle,description,kind,price_label,payment_link,redirect_key,access_code_hash,max_downloads,link_days,published,sort,download_count,created_at,updated_at'
export const FILE_COLS = 'id,product_id,name,size_bytes,mime,download_count,created_at'
export const ORDER_COLS = 'id,product_id,via,buyer_email,downloads,max_downloads,expires_at,revoked,emailed_at,created_at'
/** Never send the code hash to the browser. */
export function toProduct(r: any) { const { access_code_hash, ...p } = r || {}; return { ...p, has_code: !!access_code_hash } }
