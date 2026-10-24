import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { serviceClient } from '@/lib/server/admin-client'
import { DOWNLOAD_BUCKET, pathOwnedBy, storagePathOf } from '@/lib/downloads'

export const dynamic = 'force-dynamic'
const SIGNED_TTL_SECONDS = 60
const unavailable = () => NextResponse.json({ error: 'This file is unavailable.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })

// Serves a funnel's uploaded file: allowed if the funnel is public AND its owner has funnels access
// (fm_has_funnels_access), or if the signed-in user owns the funnel (builder preview). Redirects to a 60s signed URL.
export async function GET(_req: Request, { params }: { params: Promise<{ funnelId: string; stepId: string }> }) {
  const { funnelId, stepId } = await params
  if (!/^[0-9a-f-]{36}$/i.test(funnelId) || stepId.length > 100) return unavailable()
  const db = serviceClient()
  const { data: funnel } = await db.from('funnels').select('id, user_id, is_public, steps').eq('id', funnelId).maybeSingle()
  if (!funnel) return unavailable()

  let allowed = false
  if (funnel.is_public) {
    const { data } = await db.rpc('fm_has_funnels_access', { uid: funnel.user_id })
    allowed = data === true
  }
  if (!allowed) {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    allowed = !!user && user.id === funnel.user_id
  }
  if (!allowed) return unavailable()

  const steps: any[] = Array.isArray(funnel.steps) ? funnel.steps : []
  const step = steps.find((s) => s && String(s.id) === stepId)
  const path = storagePathOf(step?.downloadUrl)
  if (!path || !pathOwnedBy(path, funnel.user_id)) return unavailable()

  const { data: signed, error } = await db.storage.from(DOWNLOAD_BUCKET).createSignedUrl(path, SIGNED_TTL_SECONDS, { download: true })
  if (error || !signed?.signedUrl) return unavailable()
  return NextResponse.redirect(signed.signedUrl, { status: 302, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })
}
