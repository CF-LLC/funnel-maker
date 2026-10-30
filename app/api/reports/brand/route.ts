import { NextResponse } from 'next/server'
import { rpGuard, bad } from '@/lib/reports/guard'
import { cleanText } from '@/lib/reports/core'

/** Business name shown on client reports (falls back to the Invoices / Link-in-bio name). */
export async function PATCH(req: Request) {
  const g = await rpGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  const business_name = cleanText(b?.business_name, 120) || null
  const { error } = await g.db.from('rp_brand').upsert({ user_id: g.user.id, business_name, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) return bad('Could not save.')
  return NextResponse.json({ ok: true, business_name })
}
