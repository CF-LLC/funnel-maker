import { ttGuard, bad } from '@/lib/time/guard'
import { ENTRY_COLS, isDate, toCsv } from '@/lib/time/core'
import { DEMO_CLIENTS, DEMO_PROJECTS, DEMO_SETTINGS, demoEntries } from '@/lib/time/demo'

export const dynamic = 'force-dynamic'
/** CSV of stopped entries between from..to (inclusive). */
export async function GET(req: Request) {
  const g = await ttGuard(false); if (g.err) return g.err
  const u = new URL(req.url)
  const from = u.searchParams.get('from'), to = u.searchParams.get('to')
  if (!isDate(from) || !isDate(to) || from > to) return bad('Pick a date range.')
  let csv: string
  if (g.demo) csv = toCsv(demoEntries().filter((e) => e.entry_date >= from && e.entry_date <= to), DEMO_PROJECTS, DEMO_CLIENTS, DEMO_SETTINGS)
  else {
    const [s, c, p, e] = await Promise.all([
      g.db.from('tt_settings').select('default_rate_cents, currency').maybeSingle(),
      g.db.from('tt_clients').select('id, name, email, crm_email, archived'),
      g.db.from('tt_projects').select('id, client_id, name, hourly_rate_cents, billable, archived'),
      g.db.from('tt_entries').select(ENTRY_COLS).gte('entry_date', from).lte('entry_date', to).not('seconds', 'is', null).limit(10000),
    ])
    if (e.error) return bad('Could not export.', 500)
    csv = toCsv(e.data || [], p.data || [], c.data || [], s.data || null)
  }
  return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="time-${from}-to-${to}.csv"`, 'cache-control': 'no-store' } })
}
