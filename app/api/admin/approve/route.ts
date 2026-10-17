import { NextResponse } from 'next/server'
import { currentAdminId, serviceClient } from '@/lib/server/admin-client'

export const dynamic = 'force-dynamic'

// GET: accounts with their approval state. POST {userId, approved}: approve or un-approve.
export async function GET() {
  if (!(await currentAdminId())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data, error } = await serviceClient()
    .from('users')
    .select('id, email, approved, approved_at, signup_template')
    .order('approved', { ascending: true })
    .limit(500)
  if (error) return NextResponse.json({ error: 'Could not load users' }, { status: 500 })
  return NextResponse.json({ users: data })
}

export async function POST(request: Request) {
  if (!(await currentAdminId())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const userId = body?.userId
  const approved = body?.approved
  if (typeof userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(userId) || typeof approved !== 'boolean') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const { error } = await serviceClient()
    .from('users')
    .update({ approved, approved_at: approved ? new Date().toISOString() : null })
    .eq('id', userId)
  if (error) return NextResponse.json({ error: 'Could not update user' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
