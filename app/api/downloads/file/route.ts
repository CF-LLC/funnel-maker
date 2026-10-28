import { NextResponse } from 'next/server'
import { signedDownload } from '@/lib/dlstore/public'
import { clientIp, rateLimit } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'
/** POST (not GET) so link previews and prefetchers never use up a buyer's downloads. Redirects to a 60-second signed URL. */
export async function POST(req: Request) {
  if (!rateLimit(`dl-file-ip:${clientIp(req)}`, 30, 10 * 60_000)) return NextResponse.json({ error: 'Too many downloads. Please wait a few minutes.' }, { status: 429 })
  const form = await req.formData().catch(() => null)
  const t = String(form?.get('t') || ''), f = String(form?.get('f') || '')
  const url = await signedDownload(t, f).catch(() => null)
  if (!url) return NextResponse.redirect(new URL(`/d/${encodeURIComponent(t)}?e=1`, req.url), 303)
  return NextResponse.redirect(url, 303)
}
