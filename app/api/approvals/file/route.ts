import { NextResponse } from 'next/server'
import { apGuard, bad } from '@/lib/approvals/guard'
import { BUCKET, SIGNED_TTL_SECONDS, isUuid } from '@/lib/approvals/core'

/** Owner: short-lived signed link to one of your own version files. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id'); if (!isUuid(id)) return bad('Not found.', 404)
  const g = await apGuard(false); if (g.err) return g.err
  const { data: v } = await g.db.from('ap_versions').select('path').eq('id', id).eq('kind', 'file').maybeSingle()
  if (!v?.path) return bad('Not found.', 404)
  const { data } = await g.db.storage.from(BUCKET).createSignedUrl(v.path, SIGNED_TTL_SECONDS)
  if (!data?.signedUrl) return bad('Could not open the file.')
  return NextResponse.json({ url: data.signedUrl }, { headers: { 'Cache-Control': 'no-store' } })
}
