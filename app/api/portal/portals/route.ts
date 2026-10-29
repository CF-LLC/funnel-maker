import { NextResponse } from 'next/server'
import { ptGuard, bad } from '@/lib/portal/guard'
import { MAX_PORTALS, PORTAL_COLS, STARTER_TEMPLATE, cleanEmail, cleanItems, isUuid } from '@/lib/portal/core'

/** Create a portal for a client (from a CRM contact or typed name + email), seeded from a template or the starter list. */
export async function POST(req: Request) {
  const g = await ptGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  const name = typeof b?.client_name === 'string' ? b.client_name.trim().slice(0, 120) : ''
  if (!name) return bad('Add the client’s name.')
  const email = b?.client_email ? cleanEmail(b.client_email) : null
  if (b?.client_email && !email) return bad('That email doesn’t look right.')
  const { count } = await g.db.from('pt_portals').select('id', { count: 'exact', head: true })
  if ((count || 0) >= MAX_PORTALS) return bad(`Up to ${MAX_PORTALS} portals.`)
  let items = STARTER_TEMPLATE
  if (b?.template_id === 'none') items = []
  else if (isUuid(b?.template_id)) {
    const { data: t } = await g.db.from('pt_templates').select('items').eq('id', b.template_id).maybeSingle()
    items = cleanItems(t?.items) || []
  }
  const { data: p, error } = await g.db.from('pt_portals').insert({ user_id: g.user.id, client_name: name, client_email: email, welcome: typeof b?.welcome === 'string' ? b.welcome.trim().slice(0, 1000) || null : null }).select(PORTAL_COLS).single()
  if (error || !p) return bad('Could not create the portal.')
  if (items.length) await g.db.from('pt_tasks').insert(items.map((t, i) => ({ user_id: g.user.id, portal_id: p.id, title: t.title, note: t.note || null, link: t.link || null, who: t.who, sort: i })))
  return NextResponse.json({ portal: p })
}
