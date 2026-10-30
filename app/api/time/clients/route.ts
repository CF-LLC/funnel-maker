import { NextResponse } from 'next/server'
import { ttGuard, bad } from '@/lib/time/guard'
import { cleanText } from '@/lib/time/core'

/** New client: type a name, or pick a CRM contact (crm_email) and its name/email are copied. */
export async function POST(req: Request) {
  const g = await ttGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  let name = cleanText(b?.name, 120), email: string | null = null, crm: string | null = null
  if (typeof b?.crm_email === 'string' && b.crm_email) {
    const { data: ct } = await g.db.from('crm_contacts').select('email, name, company').eq('email', b.crm_email.trim().toLowerCase()).maybeSingle()
    if (!ct) return bad('That CRM contact was not found.')
    crm = ct.email; email = ct.email; name = name || cleanText(ct.company || ct.name || ct.email, 120)
  }
  if (!name) return bad('Give the client a name.')
  const { data, error } = await g.db.from('tt_clients').insert({ user_id: g.user.id, name, email, crm_email: crm }).select('id, name, email, crm_email, archived').single()
  if (error) return bad('Could not add the client.')
  return NextResponse.json({ client: data })
}
