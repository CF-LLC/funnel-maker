import { NextResponse } from 'next/server'
import { rpGuard, bad, dbErr } from '@/lib/reports/guard'
import { BUCKET, IMAGE_COLS, IMAGE_TYPES, MAX_FILE_BYTES, MAX_STORAGE_BYTES, SIGNED_TTL_SECONDS, cleanText, isUuid, totalSlots } from '@/lib/reports/core'

type Ctx = { params: Promise<{ id: string }> }
export const dynamic = 'force-dynamic'
/** Upload or replace the screenshot in one slot (multipart: file, slot, caption). PNG/JPEG, 10 MB, 500 MB per account. */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await rpGuard(true); if (g.err) return g.err
  if (Number(req.headers.get('content-length') || 0) > MAX_FILE_BYTES + 64 * 1024) return bad('Screenshots can be up to 10 MB.', 413)
  const form = await req.formData().catch(() => null)
  const file = form?.get('file'); const slot = Number(form?.get('slot'))
  if (!file || typeof file === 'string') return bad('Pick an image.')
  const ext = IMAGE_TYPES[file.type]; if (!ext) return bad('Screenshots can be PNG or JPG.')
  if (file.size < 1 || file.size > MAX_FILE_BYTES) return bad('Screenshots can be up to 10 MB.', 413)
  const { data: rep } = await g.db.from('rp_reports').select('id, layout').eq('id', id).maybeSingle()
  if (!rep) return bad('Not found.', 404)
  if (!Number.isInteger(slot) || slot < 0 || slot >= totalSlots(rep.layout)) return bad('That image slot isn’t in this report.')
  const [{ data: imgs }, { data: brand }, { data: old }] = await Promise.all([
    g.db.from('rp_images').select('size_bytes').neq('report_id', id).limit(100000),
    g.db.from('rp_brand').select('logo_bytes').maybeSingle(),
    g.db.from('rp_images').select('id, path, size_bytes, slot').eq('report_id', id),
  ])
  const used = [...(imgs || []), ...(old || []).filter((o: any) => o.slot !== slot)].reduce((n: number, r: any) => n + Number(r.size_bytes || 0), 0) + Number(brand?.logo_bytes || 0)
  if (used + file.size > MAX_STORAGE_BYTES) return bad('Image storage is full (500 MB). Delete some old screenshots first.')
  const path = `${g.user.id}/${id}/${crypto.randomUUID()}.${ext}`
  const up = await g.db.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (up.error) return bad('Could not upload the image.')
  const prev = (old || []).find((o: any) => o.slot === slot)
  if (prev) await g.db.from('rp_images').delete().eq('id', prev.id)
  const caption = cleanText(form?.get('caption'), 200) || null
  const { data, error } = await g.db.from('rp_images').insert({ user_id: g.user.id, report_id: id, slot, path, name: cleanText(file.name, 200) || `screenshot.${ext}`, mime: file.type, size_bytes: file.size, caption }).select(IMAGE_COLS).single()
  if (error || !data) { await g.db.storage.from(BUCKET).remove([path]); return dbErr(error, 'Could not save the image.') }
  if (prev) await g.db.storage.from(BUCKET).remove([prev.path])
  const { data: s } = await g.db.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL_SECONDS)
  return NextResponse.json({ image: { ...data, url: s?.signedUrl || null } })
}
/** Caption change: JSON { slot, caption }. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await rpGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  const { data, error } = await g.db.from('rp_images').update({ caption: cleanText(b?.caption, 200) || null }).eq('report_id', id).eq('slot', Number(b?.slot)).select(IMAGE_COLS).maybeSingle()
  if (error || !data) return bad('Not found.', 404)
  return NextResponse.json({ image: data })
}
export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await rpGuard(true); if (g.err) return g.err
  const slot = Number(new URL(req.url).searchParams.get('slot'))
  const { data } = await g.db.from('rp_images').delete().eq('report_id', id).eq('slot', slot).select('path')
  if (!data?.length) return bad('Not found.', 404)
  await g.db.storage.from(BUCKET).remove(data.map((x: any) => x.path))
  return NextResponse.json({ ok: true })
}
