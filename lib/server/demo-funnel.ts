import { serviceClient } from '@/lib/server/admin-client'
import { demoUserIds } from '@/lib/demo'

/** True if the public funnel (by slug or id) belongs to a demo account (DEMO_USER_IDS). Server-only. */
export async function isDemoFunnel(by: { slug?: string; id?: string }): Promise<boolean> {
  const ids = demoUserIds()
  if (!ids.size || (!by.slug && !by.id)) return false
  let q = (serviceClient() as any).from('funnels').select('user_id').eq('is_public', true)
  q = by.slug ? q.eq('slug', by.slug) : q.eq('id', by.id)
  const { data } = await q.maybeSingle()
  return !!data && ids.has(String(data.user_id).toLowerCase())
}
