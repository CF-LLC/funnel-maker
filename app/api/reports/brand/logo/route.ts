import { NextResponse } from 'next/server'
import { rpGuard, bad, dbErr } from '@/lib/reports/guard'
import { BUCKET, IMAGE_TYPES, MAX_STORAGE_BYTES, SIGNED_TTL_SECONDS } from '@/lib/reports/core'

const MAX_LOGO = 2 * 1024 * 1024
export const dynamic = 'force-dynamic'
/** Upload or replace the logo shown on client reports (PNG/JPEG, 2 MB). */
export async function POST(req: Request) {
  const g = await rpGuard(true); if (g.err) return g.err
  if (Number(req.headers.get('content-length') || 0) > MAX_LOGO + 64 * 1024) return bad('Logos can be up to 2 MB.', 413)
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!file || typeof file === 'string') return bad('Pick an image.')
  const ext = IMAGE_TYPES[file.type]; if (!ext) return bad('Logos can be PNG or JPG.')
  if (file.size < 1 || file.size > MAX_LOGO) return bad('Logos can be up to 2 MB.', 413)
  const [{ data: imgs }, { data: old }] = await Promise.all([
    g.db.from('rp_images').select('size_bytes').limit(100000),
    g.db.from('rp_brand').select('logo_path').maybeSingle(),
  ])
  const used = (imgs || []).reduce((n: number, r: any) => n + Number(r.size_bytes || 0), 0)
  if (used + file.size > MAX_STORAGE_BYTES) return bad('Image storage is full (500 MB). Delete some old screenshots first.')
  const path = `${g.user.id}/logo/${crypto.randomUUID()}.${ext}`
  const up = await g.db.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (up.error) return bad('Could not upload the logo.')
  const { error } = await g.db.from('rp_brand').upsert({ user_id: g.user.id, logo_path: path, logo_bytes: file.size, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) { await g.db.storage.from(BUCKET).remove([path]); return dbErr(error, 'Could not save the logo.') }
  if (old?.logo_path) await g.db.storage.from(BUCKET).remove([old.logo_path])
  const { data: s } = await g.db.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL_SECONDS)
  return NextResponse.json({ logo_url: s?.signedUrl || null })
}
export async function DELETE() {
  const g = await rpGuard(true); if (g.err) return g.err
  const { data: old } = await g.db.from('rp_brand').select('logo_path').maybeSingle()
  if (!old?.logo_path) return NextResponse.json({ ok: true })
  await g.db.from('rp_brand').update({ logo_path: null, logo_bytes: null, updated_at: new Date().toISOString() }).eq('user_id', g.user.id)
  await g.db.storage.from(BUCKET).remove([old.logo_path])
  return NextResponse.json({ ok: true })
}
