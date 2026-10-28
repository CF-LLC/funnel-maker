import { NextResponse } from 'next/server'
import { adminApiGuard } from '@/lib/admin/guard'
import { audit } from '@/lib/admin/load'
import { FLAG_KEY_RE } from '@/lib/admin/core'
import { serviceClient } from '@/lib/server/admin-client'
import { logError } from '@/lib/server/log-error'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

/** POST {key, enabled}: toggles an existing feature flag (no creating new keys from the UI). Audited. */
export async function POST(request: Request) {
  const g = await adminApiGuard()
  if (g.res) return g.res
  const b = await request.json().catch(() => null)
  if (!b || typeof b.key !== 'string' || !FLAG_KEY_RE.test(b.key) || typeof b.enabled !== 'boolean') return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  try {
    const { data, error } = await serviceClient().from('feature_flags').update({ enabled: b.enabled, updated_at: new Date().toISOString(), updated_by: g.adminId }).eq('key', b.key).select('key')
    if (error) throw error
    if (!data?.length) return NextResponse.json({ error: 'Unknown flag' }, { status: 404 })
    await audit(g.adminId, 'flag.set', null, { key: b.key, enabled: b.enabled })
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    await logError('/api/admin/flags', e, { userId: g.adminId })
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
