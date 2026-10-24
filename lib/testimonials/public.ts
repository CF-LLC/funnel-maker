import { serviceClient } from '@/lib/server/admin-client'
import { HANDLE_RE, normalizeHandle } from '@/lib/linkinbio/core'
import { photoSrc, type Layout } from '@/lib/testimonials/core'

export type PublicReview = { id: string; name: string; role: string | null; rating: number; body: string; photo: string | null; approved_at: string }
export type ReviewOwner = { user_id: string; handle: string; display_name: string; accepting: boolean; linkinbio_layout: Layout; proposals_layout: Layout }

/** Owner of a handle who currently has testimonials (or all) access. Null otherwise (pages 404). */
export async function getReviewOwner(raw: string): Promise<ReviewOwner | null> {
  const handle = normalizeHandle(raw)
  if (!HANDLE_RE.test(handle)) return null
  const db = serviceClient() as any
  const { data: prof } = await db.from('lib_profiles').select('user_id, handle, display_name').eq('handle', handle).maybeSingle()
  if (!prof) return null
  return ownerFor(prof.user_id, prof.handle, prof.display_name || '')
}

export async function ownerFor(userId: string, handle: string, display_name = ''): Promise<ReviewOwner | null> {
  const db = serviceClient() as any
  const { data: ok } = await db.rpc('tst_has_access', { uid: userId })
  if (ok !== true) return null
  const { data: s } = await db.from('tst_settings').select('accepting, linkinbio_layout, proposals_layout').eq('user_id', userId).maybeSingle()
  return { user_id: userId, handle, display_name, accepting: s?.accepting ?? true, linkinbio_layout: s?.linkinbio_layout ?? 'none', proposals_layout: s?.proposals_layout ?? 'none' }
}

/** Approved reviews only, newest approval first. */
export async function getApprovedReviews(userId: string, limit = 60): Promise<PublicReview[]> {
  const db = serviceClient() as any
  const { data } = await db.from('tst_reviews').select('id, name, role, rating, body, photo_path, approved_at')
    .eq('user_id', userId).eq('status', 'approved').order('approved_at', { ascending: false }).limit(limit)
  return (data || []).map((r: any) => ({ id: r.id, name: r.name, role: r.role, rating: r.rating, body: r.body, photo: r.photo_path ? photoSrc(r.id) : null, approved_at: r.approved_at }))
}

/** Reviews to embed on another tool's public page, honoring the owner's layout choice. */
export async function getEmbed(userId: string, handle: string, which: 'linkinbio_layout' | 'proposals_layout') {
  const owner = await ownerFor(userId, handle)
  if (!owner || owner[which] === 'none') return null
  const reviews = await getApprovedReviews(userId, owner[which] === 'quote' ? 1 : 6)
  return reviews.length ? { layout: owner[which] as Exclude<Layout, 'none'>, reviews, handle } : null
}
