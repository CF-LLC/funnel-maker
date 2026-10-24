import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/server/admin-client'
import { createServerClient } from '@/lib/supabase'
import { PHOTO_BUCKET, UUID_RE } from '@/lib/testimonials/core'

export const dynamic = 'force-dynamic'
const nf = () => new NextResponse('Not found', { status: 404 })

// Approved photos are public (while the owner has access); the owner can also see pending/hidden ones. 60s signed URL.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) return nf()
  const db = serviceClient() as any
  const { data: r } = await db.from('tst_reviews').select('user_id, status, photo_path').eq('id', id).maybeSingle()
  if (!r?.photo_path || !r.photo_path.startsWith(r.user_id + '/')) return nf()
  let ok = false
  if (r.status === 'approved') { const { data } = await db.rpc('tst_has_access', { uid: r.user_id }); ok = data === true }
  if (!ok) {
    const { data: { user } } = await (await createServerClient()).auth.getUser()
    ok = user?.id === r.user_id
  }
  if (!ok) return nf()
  const { data: s } = await db.storage.from(PHOTO_BUCKET).createSignedUrl(r.photo_path, 60)
  if (!s?.signedUrl) return nf()
  return NextResponse.redirect(s.signedUrl, { status: 302, headers: { 'Cache-Control': 'private, no-store' } })
}
