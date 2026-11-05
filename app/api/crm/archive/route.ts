import { NextResponse } from 'next/server'
import { crmGuard, bad } from '@/lib/crm/guard'
import { normEmail } from '@/lib/crm/core'

/**
 * Soft-archive or restore one of the signed-in user's clients.
 * archived_at is set or cleared. The row is not deleted. user_id comes from the session only.
 * A client who exists only as activity (no saved row yet) gets an archive marker row with no invented name.
 */
export async function POST(req: Request) {
  if (!(req.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) return bad('Invalid request.', 415)
  const g = await crmGuard(true); if (g.err) return g.err
  let body: unknown
  try { body = await req.json() } catch { return bad('Invalid request.') }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return bad('Invalid request.')
  const b = body as Record<string, unknown>
  const email = normEmail(b.email)
  if (!email) return bad('That email address looks invalid.')
  if (typeof b.archived !== 'boolean') return bad('Say whether to archive or restore.')
  const now = new Date().toISOString()
  const archived_at = b.archived ? now : null
  const { data, error } = await g.db.from('crm_contacts').update({ archived_at, updated_at: now }).eq('user_id', g.user.id).eq('email', email).select('email, archived_at').maybeSingle()
  if (error) return bad(error.code === '42501' ? 'You cannot change that client.' : 'Could not update this client.', error.code === '42501' ? 403 : 500)
  if (data) return NextResponse.json({ ok: true, email, archived_at: data.archived_at ?? null })
  if (!b.archived) return bad('Client not found.', 404)
  const { error: insErr } = await g.db.from('crm_contacts').insert({ user_id: g.user.id, email, archived_at, created_at: now, updated_at: now })
  if (insErr) return bad(insErr.code === '42501' ? 'You cannot change that client.' : insErr.code === '23505' ? 'Could not update this client.' : 'Could not update this client.', insErr.code === '42501' ? 403 : 500)
  return NextResponse.json({ ok: true, email, archived_at })
}
