import { NextResponse } from 'next/server'
import { apGuard, bad } from '@/lib/approvals/guard'
import { BUCKET, MAX_VERSIONS, VERSION_COLS, checkFile, cleanVideoUrl, isUuid, nextNumber, pathOwned } from '@/lib/approvals/core'

/**
 * New version. Either a file the browser already uploaded to the private bucket (owner folder only; size/type/500 MB cap
 * re-checked here from storage metadata), or a video link (we never host video). Numbered v1, v2, … automatically.
 */
export async function POST(req: Request) {
  const g = await apGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  const itemId = b?.item_id
  if (!isUuid(itemId)) return bad('Not found.', 404)
  const { data: item } = await g.db.from('ap_items').select('id').eq('id', itemId).maybeSingle()
  const path = typeof b?.path === 'string' ? b.path : ''
  const drop = async () => { if (path && pathOwned(path, g.user.id, itemId)) await g.db.storage.from(BUCKET).remove([path]) }
  if (!item) { await drop(); return bad('Not found.', 404) }
  const { data: vs } = await g.db.from('ap_versions').select('number').eq('item_id', itemId)
  if ((vs || []).length >= MAX_VERSIONS) { await drop(); return bad(`Up to ${MAX_VERSIONS} versions per item.`) }
  const note = typeof b?.note === 'string' ? b.note.trim().slice(0, 1000) || null : null
  let row: Record<string, unknown>
  if (b?.kind === 'video') {
    const url = cleanVideoUrl(b?.video_url)
    if (!url) return bad('Paste a full https:// link to the video.')
    row = { kind: 'video', video_url: url }
  } else {
    if (!pathOwned(path, g.user.id, itemId)) return bad('Bad file.')
    const { data: used } = await g.db.from('ap_versions').select('size_bytes').eq('kind', 'file').limit(10000)
    const usedBytes = (used || []).reduce((s: number, f: any) => s + Number(f.size_bytes || 0), 0)
    const folder = path.split('/').slice(0, 2).join('/'), objName = path.split('/')[2]
    const { data: objs } = await g.db.storage.from(BUCKET).list(folder, { search: objName, limit: 5 })
    const obj = (objs || []).find((o: any) => o.name === objName)
    const size = Number(obj?.metadata?.size ?? obj?.metadata?.contentLength)
    const chk = checkFile(b?.name, size, usedBytes)
    if (!obj || !chk.ok) { await drop(); return bad(!obj ? 'Upload did not finish. Try again.' : !chk.ok ? chk.error : '') }
    row = { kind: 'file', path, name: chk.name, mime: chk.mime, size_bytes: size }
  }
  const { data, error } = await g.db.from('ap_versions').insert({ user_id: g.user.id, item_id: itemId, number: nextNumber(vs || []), note, ...row }).select(VERSION_COLS).single()
  if (error || !data) { await drop(); return bad('Could not save the version. Try again.') }
  await g.db.from('ap_items').update({ updated_at: new Date().toISOString() }).eq('id', itemId)
  return NextResponse.json({ version: data })
}
