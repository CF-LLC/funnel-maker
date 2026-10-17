import { NextResponse } from 'next/server'
import { currentAdminId, serviceClient } from '@/lib/server/admin-client'

export const dynamic = 'force-dynamic'

// GET: accounts with approval + plan. POST {userId, approved?, plan?, paidUntil?}: admin updates.
export async function GET() {
  if (!(await currentAdminId())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data, error } = await serviceClient()
    .from('users')
    .select('id, email, approved, approved_at, signup_template, plan, paid_until')
    .order('approved', { ascending: true })
    .limit(500)
  if (error) return NextResponse.json({ error: 'Could not load users' }, { status: 500 })
  return NextResponse.json({ users: data })
}

export async function POST(request: Request) {
  if (!(await currentAdminId())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const userId = body?.userId
  if (typeof userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const update: Record<string, unknown> = {}
  if ('approved' in body) {
    if (typeof body.approved !== 'boolean') return NextResponse.json({ error: 'Invalid approved' }, { status: 400 })
    update.approved = body.approved
    update.approved_at = body.approved ? new Date().toISOString() : null
  }
  if ('plan' in body) {
    if (body.plan !== null && !['monthly', 'yearly', 'founding'].includes(body.plan)) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    update.plan = body.plan
  }
  if ('paidUntil' in body) {
    if (body.paidUntil !== null && !(typeof body.paidUntil === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.paidUntil))) {
      return NextResponse.json({ error: 'Invalid paidUntil' }, { status: 400 })
    }
    update.paid_until = body.paidUntil
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  const { error } = await serviceClient().from('users').update(update).eq('id', userId)
  if (error) return NextResponse.json({ error: 'Could not update user' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
