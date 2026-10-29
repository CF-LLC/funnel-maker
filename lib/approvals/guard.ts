import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { hasAccess } from '@/lib/access'
import { isDemoUser } from '@/lib/demo'

export const DEMO_MSG = 'This is the demo account, so nothing is saved.'
/** Auth → access → (for writes) demo. Returns the session client so owner RLS applies to every query. */
export async function apGuard(write: boolean) {
  const db: any = await createServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { err: NextResponse.json({ error: 'Please sign in again.' }, { status: 401 }) }
  const demo = isDemoUser(user.id)
  if (!demo && !(await hasAccess(user, 'approvals'))) return { err: NextResponse.json({ error: 'Approval link is not on your plan yet.' }, { status: 403 }) }
  if (write && demo) return { err: NextResponse.json({ error: DEMO_MSG, demo: true }, { status: 403 }) }
  return { db, user, demo }
}
export const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
