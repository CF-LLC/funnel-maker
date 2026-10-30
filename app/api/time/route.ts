import { NextResponse } from 'next/server'
import { ttGuard, bad } from '@/lib/time/guard'
import { ENTRY_COLS, addDays, isDate, localDate } from '@/lib/time/core'
import { DEMO_CLIENTS, DEMO_PROJECTS, DEMO_SETTINGS, demoEntries } from '@/lib/time/demo'

export const dynamic = 'force-dynamic'
/** Everything the page needs: settings, clients, projects, CRM contacts to pick from, and entries from `from` (default 62 days back) plus any running timer. */
export async function GET(req: Request) {
  const g = await ttGuard(false); if (g.err) return g.err
  const u = new URL(req.url)
  const from = u.searchParams.get('from') || addDays(localDate(), -62)
  if (!isDate(from)) return bad('Bad date.')
  if (g.demo) return NextResponse.json({ demo: true, settings: DEMO_SETTINGS, clients: DEMO_CLIENTS, projects: DEMO_PROJECTS, entries: demoEntries(), crm: [{ email: 'hello@riverside.example', name: 'Riverside Yoga Studio', company: null }, { email: 'sam@northside.example', name: 'Sam Patel', company: 'Northside Fitness' }] })
  const [s, c, p, e, r, crm] = await Promise.all([
    g.db.from('tt_settings').select('default_rate_cents, currency').maybeSingle(),
    g.db.from('tt_clients').select('id, name, email, crm_email, archived').order('name'),
    g.db.from('tt_projects').select('id, client_id, name, hourly_rate_cents, billable, archived').order('name'),
    g.db.from('tt_entries').select(ENTRY_COLS).gte('entry_date', from).not('seconds', 'is', null).order('entry_date', { ascending: false }).order('created_at', { ascending: false }).limit(2000),
    g.db.from('tt_entries').select(ENTRY_COLS).is('seconds', null).limit(1),
    g.db.from('crm_contacts').select('email, name, company').order('name').limit(500),
  ])
  if (c.error || p.error || e.error) return bad('Could not load your time.', 500)
  return NextResponse.json({
    demo: false, settings: s.data || { default_rate_cents: null, currency: 'USD' }, clients: c.data || [], projects: p.data || [],
    entries: [...(r.data || []), ...(e.data || [])], crm: crm.data || [],
  })
}
