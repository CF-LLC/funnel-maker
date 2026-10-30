import { NextResponse } from 'next/server'
import { exGuard, bad, dbErr } from '@/lib/expenses/guard'
import { BUCKET, EXPENSE_COLS, isUuid, parseExpense } from '@/lib/expenses/core'

type Ctx = { params: Promise<{ id: string }> }
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await exGuard(true); if (g.err) return g.err
  const p = parseExpense(await req.json().catch(() => null), true)
  if ('error' in p) return bad(p.error)
  if (!Object.keys(p.row).length) return bad('Nothing to change.')
  const { data, error } = await g.db.from('ex_expenses').update(p.row).eq('id', id).select(EXPENSE_COLS).maybeSingle()
  if (error) return dbErr(error, 'Could not save the expense.')
  if (!data) return bad('Not found.', 404)
  return NextResponse.json({ expense: data })
}
/** Deletes the expense and its receipt file. A billed expense must be unbilled first (delete its invoice). */
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await exGuard(true); if (g.err) return g.err
  const { data: e } = await g.db.from('ex_expenses').select('id, receipt_path, invoice_id').eq('id', id).maybeSingle()
  if (!e) return bad('Not found.', 404)
  if (e.invoice_id) return bad('This expense is on an invoice. Delete that invoice in Invoices first.')
  const { error } = await g.db.from('ex_expenses').delete().eq('id', id)
  if (error) return bad('Could not delete the expense.')
  if (e.receipt_path) await g.db.storage.from(BUCKET).remove([e.receipt_path])
  return NextResponse.json({ ok: true })
}
