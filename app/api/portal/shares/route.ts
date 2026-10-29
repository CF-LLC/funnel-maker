import { NextResponse } from 'next/server'
import { ptGuard, bad } from '@/lib/portal/guard'
import { KINDS, isUuid } from '@/lib/portal/core'

/** Share / unshare one of the owner's existing invoices, proposals or bookings. A DB trigger re-checks ownership. */
export async function POST(req: Request) {
  const g = await ptGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  if (!isUuid(b?.portal_id) || !isUuid(b?.ref_id) || !KINDS.includes(b?.kind)) return bad('Bad request.')
  if (b.shared === false) {
    await g.db.from('pt_shares').delete().eq('portal_id', b.portal_id).eq('kind', b.kind).eq('ref_id', b.ref_id)
    return NextResponse.json({ ok: true })
  }
  const { error } = await g.db.from('pt_shares').upsert({ user_id: g.user.id, portal_id: b.portal_id, kind: b.kind, ref_id: b.ref_id }, { onConflict: 'portal_id,kind,ref_id', ignoreDuplicates: true })
  if (error) return bad('Could not share that.')
  return NextResponse.json({ ok: true })
}
