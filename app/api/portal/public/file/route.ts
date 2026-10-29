import { NextResponse } from 'next/server'
import { clientIp, rateLimit } from '@/lib/server/rate-limit'
import { DEMO_TOKEN } from '@/lib/portal/core'
import { fileUrl } from '@/lib/portal/public'

export const dynamic = 'force-dynamic'
/** POST form {token, file_id} → 303 to a 60-second signed URL. POST-only so link previews can't trigger downloads. */
export async function POST(req: Request) {
  const f = await req.formData().catch(() => null)
  const token = String(f?.get('token') || ''), fileId = String(f?.get('file_id') || '')
  const back = new URL(`/p/${encodeURIComponent(token)}`, req.url)
  if (token === DEMO_TOKEN) { back.searchParams.set('demo', '1'); return NextResponse.redirect(back, 303) }
  if (!rateLimit(`pt-file:${clientIp(req)}`, 30, 60_000)) { back.searchParams.set('e', 'rate'); return NextResponse.redirect(back, 303) }
  const url = await fileUrl(token, fileId)
  if (!url) { back.searchParams.set('e', 'file'); return NextResponse.redirect(back, 303) }
  return NextResponse.redirect(url, 303)
}
