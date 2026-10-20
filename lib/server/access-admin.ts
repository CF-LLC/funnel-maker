import { serviceClient } from '@/lib/server/admin-client'
import type { Tool, AccessSource } from '@/lib/access'

/** Founding invoices access is only granted while invoices hasn't launched (INVOICES_FOUNDING_OPEN != 'false'). */
export const foundingOpen = () => process.env.INVOICES_FOUNDING_OPEN !== 'false'

export async function setAccess(userId: string, tool: Tool, patch: { active: boolean; source?: AccessSource; plan?: string | null }) {
  const db = serviceClient()
  const { data: existing } = await db.from('app_access').select('id, source').eq('user_id', userId).eq('tool', tool).maybeSingle()
  if (existing) {
    const upd: Record<string, unknown> = { active: patch.active }
    if (patch.source) upd.source = patch.source
    if (patch.plan !== undefined) upd.plan = patch.plan
    return db.from('app_access').update(upd).eq('id', existing.id)
  }
  return db.from('app_access').insert({ user_id: userId, tool, active: patch.active, source: patch.source ?? 'single', plan: patch.plan ?? null })
}

/** Called when an account is approved/revoked: keeps funnels access in sync, grants founding invoices while open. */
export async function syncApproval(userId: string, approved: boolean) {
  const r = await setAccess(userId, 'funnels', { active: approved })
  if (r.error) return r
  if (approved && foundingOpen()) {
    const { data } = await serviceClient().from('app_access').select('id').eq('user_id', userId).eq('tool', 'invoices').maybeSingle()
    if (!data) return setAccess(userId, 'invoices', { active: true, source: 'founding' })
  }
  return r
}
