import { NextResponse } from 'next/server'
import { pdGuard, bad } from '@/lib/paid/guard'

/** Undo a confirmed match: the invoice goes back to unpaid. */
export async function POST(req: Request) {
  const g = await pdGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  if (!/^[0-9a-f-]{36}$/i.test(String(b?.matchId || ''))) return bad('Missing match.')
  const { error } = await g.db.rpc('pd_undo', { p_match: b.matchId })
  if (error) return bad(error.code === 'P0002' ? 'That match was already undone.' : 'Could not undo it.', error.code === 'P0002' ? 409 : 400)
  return NextResponse.json({ ok: true })
}
