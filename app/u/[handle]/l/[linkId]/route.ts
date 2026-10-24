import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/server/admin-client'
import { HANDLE_RE, normalizeHandle } from '@/lib/linkinbio/core'
import { safeHttpsUrl } from '@/lib/url-safety'

export const dynamic = 'force-dynamic'
const unavailable = () => NextResponse.json({ error: 'This page is unavailable.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })

/** Counts a click (published page + owner access, enforced in lib_record_click) and redirects to the link. */
export async function GET(_req: Request, { params }: { params: Promise<{ handle: string; linkId: string }> }) {
  const { handle, linkId } = await params
  const h = normalizeHandle(handle)
  if (!HANDLE_RE.test(h) || !/^[0-9a-f-]{36}$/i.test(linkId)) return unavailable()
  const { data } = await serviceClient().rpc('lib_record_click' as any, { p_handle: h, p_link: linkId } as any)
  const url = safeHttpsUrl(data)
  if (!url) return unavailable()
  return NextResponse.redirect(url, { status: 302, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })
}
