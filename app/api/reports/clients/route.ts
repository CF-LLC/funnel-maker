import { NextResponse } from 'next/server'
import { rpGuard, bad, dbErr } from '@/lib/reports/guard'
import { CLIENT_COLS, MAX_CLIENTS, cleanEmail, cleanText, defaultTemplate } from '@/lib/reports/core'

/** New client with the default report template. */
export async function POST(req: Request) {
  const g = await rpGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  const name = cleanText(b?.name, 120); if (!name) return bad('Add the client’s name.')
  if (b?.email && !cleanEmail(b.email)) return bad('That email doesn’t look right.')
  const { count } = await g.db.from('rp_clients').select('id', { count: 'exact', head: true })
  if ((count || 0) >= MAX_CLIENTS) return bad(`Up to ${MAX_CLIENTS} clients.`)
  const { data, error } = await g.db.from('rp_clients').insert({ user_id: g.user.id, name, email: cleanEmail(b?.email), template: defaultTemplate() }).select(CLIENT_COLS).single()
  if (error || !data) return dbErr(error, 'Could not add the client.')
  return NextResponse.json({ client: data })
}
