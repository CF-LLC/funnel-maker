import { NextResponse } from 'next/server'
import { dlGuard, bad, FILE_COLS } from '@/lib/dlstore/guard'
import { BUCKET, MAX_FILES_PER_PRODUCT, checkFile, isUuid, pathOwned } from '@/lib/dlstore/core'

/** Registers a file the browser already uploaded to the private bucket (owner folder only; size/type re-checked from Storage). */
export async function POST(req: Request) {
  const g = await dlGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  const productId = b?.product_id, path = typeof b?.path === 'string' ? b.path : ''
  if (!isUuid(productId) || !pathOwned(path, g.user.id, productId)) return bad('Bad file.')
  const { count } = await g.db.from('dl_files').select('id', { count: 'exact', head: true }).eq('product_id', productId)
  const folder = path.split('/').slice(0, 2).join('/'), objName = path.split('/')[2]
  const { data: objs } = await g.db.storage.from(BUCKET).list(folder, { search: objName, limit: 5 })
  const obj = (objs || []).find((o: any) => o.name === objName)
  const size = Number(obj?.metadata?.size ?? obj?.metadata?.contentLength)
  const chk = checkFile(b?.name, size)
  if (!obj || !chk.ok || (count || 0) >= MAX_FILES_PER_PRODUCT) {
    await g.db.storage.from(BUCKET).remove([path])
    return bad(!obj ? 'Upload did not finish. Try again.' : !chk.ok ? chk.error : `Up to ${MAX_FILES_PER_PRODUCT} files per product.`)
  }
  const { data, error } = await g.db.from('dl_files').insert({ user_id: g.user.id, product_id: productId, path, name: chk.name, size_bytes: size, mime: chk.mime }).select(FILE_COLS).single()
  if (error) { await g.db.storage.from(BUCKET).remove([path]); return bad('Could not save the file.') }
  return NextResponse.json({ file: data })
}
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get('id'); if (!isUuid(id)) return bad('Not found.', 404)
  const g = await dlGuard(true); if (g.err) return g.err
  const { data: f } = await g.db.from('dl_files').select('path').eq('id', id).maybeSingle()
  if (!f) return bad('Not found.', 404)
  await g.db.storage.from(BUCKET).remove([f.path])
  await g.db.from('dl_files').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
