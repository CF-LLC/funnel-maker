import { NextResponse } from 'next/server'
import { currentAdminId, serviceClient } from '@/lib/server/admin-client'
import { setAccess } from '@/lib/server/access-admin'
import { isTool, ACCESS_SOURCES } from '@/lib/access'

export const dynamic = 'force-dynamic'

// GET: all access rows + users (with signup wish). POST {userId, tool, active, source?, plan?}
export async function GET() {
  if (!(await currentAdminId())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const db = serviceClient()
  const [{ data: users, error: e1 }, { data: access, error: e2 }] = await Promise.all([
    db.from('users').select('id, email, approved, plan, wish_tool').order('email').limit(1000),
    db.from('app_access').select('user_id, tool, plan, source, active, founding_lapsed, created_at').limit(5000),
  ])
  if (e1 || e2) return NextResponse.json({ error: 'Could not load access' }, { status: 500 })
  return NextResponse.json({ users, access })
}

export async function POST(request: Request) {
  if (!(await currentAdminId())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const b = await request.json().catch(() => null)
  if (!b || typeof b.userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(b.userId) || !isTool(b.tool) || typeof b.active !== 'boolean') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (b.source !== undefined && !(ACCESS_SOURCES as readonly string[]).includes(b.source)) return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
  if (b.plan !== undefined && b.plan !== null && !(typeof b.plan === 'string' && b.plan.length <= 40)) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  const { error } = await setAccess(b.userId, b.tool, { active: b.active, source: b.source, plan: b.plan })
  if (error) {
    const msg = /founding_lapsed/.test(error.message) ? 'Founding access lapsed when funnels access ended. Grant invoices as single or all_access instead.'
      : /founding_requires_active_funnels/.test(error.message) ? 'Founding invoices access needs active funnels access.' : 'Could not update access'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
