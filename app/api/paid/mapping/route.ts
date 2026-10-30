import { NextResponse } from 'next/server'
import { pdGuard, bad } from '@/lib/paid/guard'
import { cleanMapping } from '@/lib/paid/core'

/** Remember the column mapping (header names only) and the amount tolerance. */
export async function PUT(req: Request) {
  const g = await pdGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  const mapping = cleanMapping(b?.mapping); if (!mapping) return bad('Pick your columns first.')
  const tol = Math.round(Number(b?.tolerance_cents) || 0); if (tol < 0 || tol > 10000) return bad('Tolerance must be between $0 and $100.')
  const { error } = await g.db.from('pd_mappings').upsert({ user_id: g.user.id, mapping, tolerance_cents: tol, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) return bad('Could not save your column choices.')
  return NextResponse.json({ ok: true })
}
