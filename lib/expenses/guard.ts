import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { hasAccess } from '@/lib/access'
import { isDemoUser } from '@/lib/demo'

export const DEMO_MSG = 'This is the demo account, so nothing is saved.'
/** Auth → access → (for writes) demo. Returns the session client so owner RLS applies to every query. */
export async function exGuard(write: boolean) {
  const db: any = await createServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { err: NextResponse.json({ error: 'Please sign in again.' }, { status: 401 }) }
  const demo = isDemoUser(user.id)
  if (!demo && !(await hasAccess(user, 'expenses'))) return { err: NextResponse.json({ error: 'Expenses is not on your plan yet.' }, { status: 403 }) }
  if (write && demo) return { err: NextResponse.json({ error: DEMO_MSG, demo: true }, { status: 403 }) }
  return { db, user, demo }
}
export const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
export const dbErr = (e: { code?: string; message?: string } | null, fallback: string) =>
  bad(e?.code === '54000' ? 'Receipt storage is full (500 MB). Delete some old receipts first.' : e?.message?.includes('locked') ? 'This expense is on an invoice, so the amount and billable are locked. Delete that invoice in Invoices to unlock it.' : fallback)
