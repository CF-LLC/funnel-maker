import { NextResponse } from 'next/server'
import { adminApiGuard } from '@/lib/admin/guard'
import { audit } from '@/lib/admin/load'
import { FLAG_KEY_RE } from '@/lib/admin/core'
import { serviceClient } from '@/lib/server/admin-client'
import { logError } from '@/lib/server/log-error'
import { editAllowlist } from '@/lib/flags'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

/** POST {key, enabled}: toggles an existing feature flag (no creating new keys from the UI). Audited.
 *  POST {key, userId, allow}: adds/removes one user on the flag's per-user allowlist. Audited. */
export async function POST(request: Request) {
  const g = await adminApiGuard()
  if (g.res) return g.res
  const b = await request.json().catch(() => null)
  if (b && typeof b.userId === 'string') return setAllow(g.adminId, b)
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

async function setAllow(adminId: string, b: any) {
  if (typeof b.key !== 'string' || !FLAG_KEY_RE.test(b.key) || !UUID_RE.test(b.userId) || typeof b.allow !== 'boolean') return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  try {
    const db = serviceClient()
    const { data: row, error: e1 } = await db.from('feature_flags').select('allow_users').eq('key', b.key).maybeSingle()
    if (e1) throw e1
    if (!row) return NextResponse.json({ error: 'Unknown flag' }, { status: 404 })
    const allow_users = editAllowlist((row as any).allow_users, b.userId.toLowerCase(), b.allow)
    const { error } = await db.from('feature_flags').update({ allow_users, updated_at: new Date().toISOString(), updated_by: adminId }).eq('key', b.key)
    if (error) throw error
    await audit(adminId, 'flag.allow', b.userId.toLowerCase(), { key: b.key, allow: b.allow })
    return NextResponse.json({ ok: true, allowCount: allow_users.length }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    await logError('/api/admin/flags', e, { userId: adminId })
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
