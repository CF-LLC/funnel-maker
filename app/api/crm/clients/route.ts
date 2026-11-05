import { NextResponse } from 'next/server'
import { crmGuard, bad } from '@/lib/crm/guard'
import { contactHref } from '@/lib/crm/core'
import { DUPLICATE_MSG, validateAddClient } from '@/lib/crm/add-client'

/**
 * Add a client to the shared client record (crm_contacts). Session client = owner RLS; user_id from the session only.
 * CSRF: JSON body only (a cross-site form cannot send application/json without a CORS preflight, which we never allow).
 * Duplicate (same user + normalized email): nothing is changed; 409 with a link to the existing client.
 */
export async function POST(req: Request) {
  if (!(req.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) return bad('Invalid request.', 415)
  const g = await crmGuard(true); if (g.err) return g.err
  let body: unknown; try { body = await req.json() } catch { return bad('Invalid request.') }
  const v = validateAddClient(body)
  if (!v.ok) return NextResponse.json({ error: v.error, field: v.field }, { status: 400 })
  const { name, email, company, phone } = v.value
  const href = contactHref(email)
  const dup = () => NextResponse.json({ error: DUPLICATE_MSG, duplicate: true, href }, { status: 409 })
  const { data: existing, error: readErr } = await g.db.from('crm_contacts').select('email').eq('user_id', g.user.id).eq('email', email).maybeSingle()
  if (readErr) return bad('Could not save. Please try again.', 500)
  if (existing) return dup()
  const now = new Date().toISOString()
  const { error } = await g.db.from('crm_contacts').insert({ user_id: g.user.id, email, name, company, phone, created_at: now, updated_at: now })
  if (error) return error.code === '23505' ? dup() : bad('Could not save. Please try again.', 500)
  return NextResponse.json({ ok: true, href: `${href}?added=1` }, { status: 201 })
}
