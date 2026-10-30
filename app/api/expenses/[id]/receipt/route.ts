import { NextResponse } from 'next/server'
import { exGuard, bad, dbErr } from '@/lib/expenses/guard'
import { BUCKET, EXPENSE_COLS, MAX_RECEIPT_BYTES, RECEIPT_TYPES, SIGNED_TTL_SECONDS, STORAGE_CAP_BYTES, cleanText, isUuid } from '@/lib/expenses/core'

type Ctx = { params: Promise<{ id: string }> }
export const dynamic = 'force-dynamic'
/** Owner only: a short-lived signed link to the receipt (private bucket). */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await exGuard(false); if (g.err) return g.err
  if (g.demo) return bad('Demo receipts are samples, there is no file to open.')
  const { data: e } = await g.db.from('ex_expenses').select('receipt_path').eq('id', id).maybeSingle()
  if (!e?.receipt_path) return bad('Not found.', 404)
  const { data } = await g.db.storage.from(BUCKET).createSignedUrl(e.receipt_path, SIGNED_TTL_SECONDS)
  if (!data?.signedUrl) return bad('Could not open the receipt.')
  return NextResponse.json({ url: data.signedUrl }, { headers: { 'Cache-Control': 'no-store' } })
}
/** Upload or replace the receipt (multipart field "file"): image or PDF, 10 MB max, 500 MB per account. */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await exGuard(true); if (g.err) return g.err
  const len = Number(req.headers.get('content-length') || 0)
  if (len > MAX_RECEIPT_BYTES + 64 * 1024) return bad('Receipts can be up to 10 MB.', 413)
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!file || typeof file === 'string') return bad('Pick a file.')
  const ext = RECEIPT_TYPES[file.type]
  if (!ext) return bad('Receipts can be a photo (JPG, PNG, WebP, HEIC) or a PDF.')
  if (file.size < 1 || file.size > MAX_RECEIPT_BYTES) return bad('Receipts can be up to 10 MB.', 413)
  const { data: e } = await g.db.from('ex_expenses').select('id, receipt_path').eq('id', id).maybeSingle()
  if (!e) return bad('Not found.', 404)
  const { data: rows } = await g.db.from('ex_expenses').select('receipt_bytes').neq('id', id).not('receipt_bytes', 'is', null).limit(100000)
  const used = (rows || []).reduce((n: number, r: any) => n + Number(r.receipt_bytes || 0), 0)
  if (used + file.size > STORAGE_CAP_BYTES) return bad('Receipt storage is full (500 MB). Delete some old receipts first.')
  const path = `${g.user.id}/${id}/${crypto.randomUUID()}.${ext}`
  const up = await g.db.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (up.error) return bad('Could not upload the receipt.')
  const name = cleanText(file.name, 200) || `receipt.${ext}`
  const { data, error } = await g.db.from('ex_expenses').update({ receipt_path: path, receipt_name: name, receipt_mime: file.type, receipt_bytes: file.size }).eq('id', id).select(EXPENSE_COLS).single()
  if (error) { await g.db.storage.from(BUCKET).remove([path]); return dbErr(error, 'Could not save the receipt.') }
  if (e.receipt_path) await g.db.storage.from(BUCKET).remove([e.receipt_path])
  return NextResponse.json({ expense: data })
}
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await exGuard(true); if (g.err) return g.err
  const { data: e } = await g.db.from('ex_expenses').select('receipt_path').eq('id', id).maybeSingle()
  if (!e) return bad('Not found.', 404)
  const { data, error } = await g.db.from('ex_expenses').update({ receipt_path: null, receipt_name: null, receipt_mime: null, receipt_bytes: null }).eq('id', id).select(EXPENSE_COLS).single()
  if (error) return bad('Could not remove the receipt.')
  if (e.receipt_path) await g.db.storage.from(BUCKET).remove([e.receipt_path])
  return NextResponse.json({ expense: data })
}
