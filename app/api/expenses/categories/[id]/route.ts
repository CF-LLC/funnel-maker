import { NextResponse } from 'next/server'
import { exGuard, bad } from '@/lib/expenses/guard'
import { cleanText, isUuid } from '@/lib/expenses/core'

type Ctx = { params: Promise<{ id: string }> }
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await exGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  const row: Record<string, unknown> = {}
  if (b && 'name' in b) { const n = cleanText(b.name, 60); if (!n) return bad('Name the category.'); row.name = n }
  if (b && 'archived' in b) row.archived = b.archived === true
  if (!Object.keys(row).length) return bad('Nothing to change.')
  const { data, error } = await g.db.from('ex_categories').update(row).eq('id', id).select('id, name, archived').maybeSingle()
  if (error) return bad(error.code === '23505' ? 'You already have that category.' : 'Could not save the category.')
  if (!data) return bad('Not found.', 404)
  return NextResponse.json({ category: data })
}
/** Expenses in it become Uncategorized (FK on delete set null). */
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params; if (!isUuid(id)) return bad('Not found.', 404)
  const g = await exGuard(true); if (g.err) return g.err
  const { error } = await g.db.from('ex_categories').delete().eq('id', id)
  if (error) return bad('Could not delete the category.')
  return NextResponse.json({ ok: true })
}
