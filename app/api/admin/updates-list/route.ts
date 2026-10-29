import { NextResponse } from 'next/server'
import { adminApiGuard } from '@/lib/admin/guard'
import { audit } from '@/lib/admin/load'
import { serviceClient } from '@/lib/server/admin-client'
import { logError } from '@/lib/server/log-error'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

/** POST {id, subscribed:boolean}: marks a "new tools" signup unsubscribed (or restores it). Never deletes rows. Audited. */
export async function POST(request: Request) {
  const g = await adminApiGuard()
  if (g.res) return g.res
  const b = await request.json().catch(() => null)
  if (!b || !Number.isSafeInteger(b.id) || b.id < 1 || typeof b.subscribed !== 'boolean') return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  try {
    const now = new Date().toISOString()
    const { data, error } = await serviceClient().from('tool_updates_signups').update({ unsubscribed_at: b.subscribed ? null : now, updated_at: now }).eq('id', b.id).select('id')
    if (error) throw error
    if (!data?.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await audit(g.adminId, b.subscribed ? 'updates.resubscribe' : 'updates.unsubscribe', null, { signup_id: b.id })
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    await logError('/api/admin/updates-list', e, { userId: g.adminId })
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
