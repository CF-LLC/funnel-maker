import { serviceClient } from '@/lib/server/admin-client'
import { HANDLE_RE, normalizeHandle } from '@/lib/linkinbio/core'
import { UUID_RE } from '@/lib/proposals/core'

export type PublicProposal = {
  id: string; user_id: string; handle: string; title: string; intro: string; currency: string; expires_on: string | null; status: string
  client_name: string; accepted_name: string | null; responded_at: string | null; created_at: string
  seller_name: string; lines: { description: string; quantity: number; unit_price_cents: number }[]
}

/** A sent/answered proposal whose owner has proposals (or all) access, looked up by the owner's link-in-bio handle. Drafts are never public. */
export async function getPublicProposal(rawHandle: string, id: string): Promise<PublicProposal | null> {
  const handle = normalizeHandle(rawHandle)
  if (!HANDLE_RE.test(handle) || !UUID_RE.test(id)) return null
  const db = serviceClient() as any
  const { data: prof } = await db.from('lib_profiles').select('user_id').eq('handle', handle).maybeSingle()
  if (!prof) return null
  const { data: p } = await db.from('prp_proposals')
    .select('id, user_id, title, intro, currency, expires_on, status, client_name, accepted_name, responded_at, created_at')
    .eq('id', id).eq('user_id', prof.user_id).maybeSingle()
  if (!p || p.status === 'draft') return null
  const { data: ok } = await db.rpc('prp_has_access', { uid: prof.user_id })
  if (ok !== true) return null
  const [{ data: lines }, { data: biz }] = await Promise.all([
    db.from('prp_proposal_lines').select('description, quantity, unit_price_cents, position').eq('proposal_id', id).order('position'),
    db.from('inv_profiles').select('business_name').eq('user_id', prof.user_id).maybeSingle(),
  ])
  return {
    ...p, handle, seller_name: biz?.business_name || '',
    lines: (lines || []).map((l: any) => ({ description: l.description, quantity: Number(l.quantity), unit_price_cents: Number(l.unit_price_cents) })),
  }
}
