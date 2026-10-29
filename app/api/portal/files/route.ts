import { NextResponse } from 'next/server'
import { ptGuard, bad } from '@/lib/portal/guard'
import { BUCKET, FILE_COLS, MAX_FILES_PER_PORTAL, checkFile, isUuid, pathOwned } from '@/lib/portal/core'

/** Registers a file the browser already uploaded to the private bucket (owner folder only; size/type/caps re-checked here). */
export async function POST(req: Request) {
  const g = await ptGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  const portalId = b?.portal_id, path = typeof b?.path === 'string' ? b.path : ''
  if (!isUuid(portalId) || !pathOwned(path, g.user.id, portalId)) return bad('Bad file.')
  const [{ count }, { data: used }] = await Promise.all([
    g.db.from('pt_files').select('id', { count: 'exact', head: true }).eq('portal_id', portalId),
    g.db.from('pt_files').select('size_bytes').limit(5000),
  ])
  const usedBytes = (used || []).reduce((s: number, f: any) => s + Number(f.size_bytes), 0)
  const folder = path.split('/').slice(0, 2).join('/'), objName = path.split('/')[2]
  const { data: objs } = await g.db.storage.from(BUCKET).list(folder, { search: objName, limit: 5 })
  const obj = (objs || []).find((o: any) => o.name === objName)
  const size = Number(obj?.metadata?.size ?? obj?.metadata?.contentLength)
  const chk = checkFile(b?.name, size, usedBytes)
  if (!obj || !chk.ok || (count || 0) >= MAX_FILES_PER_PORTAL) {
    await g.db.storage.from(BUCKET).remove([path])
    return bad(!obj ? 'Upload did not finish. Try again.' : !chk.ok ? chk.error : `Up to ${MAX_FILES_PER_PORTAL} files per portal.`)
  }
  const { data, error } = await g.db.from('pt_files').insert({ user_id: g.user.id, portal_id: portalId, path, name: chk.name, size_bytes: size, mime: chk.mime }).select(FILE_COLS).single()
  if (error) { await g.db.storage.from(BUCKET).remove([path]); return bad('Could not save the file.') }
  return NextResponse.json({ file: data })
}
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get('id'); if (!isUuid(id)) return bad('Not found.', 404)
  const g = await ptGuard(true); if (g.err) return g.err
  const { data: f } = await g.db.from('pt_files').select('path').eq('id', id).maybeSingle()
  if (!f) return bad('Not found.', 404)
  await g.db.storage.from(BUCKET).remove([f.path])
  await g.db.from('pt_files').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
