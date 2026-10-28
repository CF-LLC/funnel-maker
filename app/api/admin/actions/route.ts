import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminApiGuard } from '@/lib/admin/guard'
import { audit } from '@/lib/admin/load'
import { serviceClient } from '@/lib/server/admin-client'
import { setAccess } from '@/lib/server/access-admin'
import { isAccessTool } from '@/lib/access'
import { SUSPEND_DURATION } from '@/lib/admin/core'
import { logError } from '@/lib/server/log-error'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'


const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('grant'), userId: z.string().uuid(), tool: z.string() }),
  z.object({ action: z.literal('revoke'), userId: z.string().uuid(), tool: z.string() }),
  z.object({ action: z.literal('suspend'), userId: z.string().uuid() }),
  z.object({ action: z.literal('unsuspend'), userId: z.string().uuid() }),
])

/** POST {action: grant|revoke, userId, tool} or {action: suspend|unsuspend, userId}. Admin only; every success writes admin_audit. Never deletes users or data. */
export async function POST(request: Request) {
  const g = await adminApiGuard()
  if (g.res) return g.res
  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  const b = parsed.data
  try {
    if (b.action === 'grant' || b.action === 'revoke') {
      if (!isAccessTool(b.tool)) return NextResponse.json({ error: 'Unknown tool' }, { status: 400 })
      const { error } = await setAccess(b.userId, b.tool, b.action === 'grant' ? { active: true, source: 'manual' } : { active: false })
      if (error) return NextResponse.json({ error: 'Could not update access' }, { status: 400 })
      await audit(g.adminId, `access.${b.action}`, b.userId, { tool: b.tool })
    } else {
      if (b.userId === g.adminId) return NextResponse.json({ error: "You can't suspend yourself" }, { status: 400 })
      const { error } = await serviceClient().auth.admin.updateUserById(b.userId, { ban_duration: b.action === 'suspend' ? SUSPEND_DURATION : 'none' } as any)
      if (error) return NextResponse.json({ error: 'Could not update user' }, { status: 400 })
      await audit(g.adminId, `user.${b.action}`, b.userId, {})
    }
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    await logError('/api/admin/actions', e, { userId: g.adminId })
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
