import { crmGuard } from '@/lib/crm/guard'
import { filterContacts, toCsv } from '@/lib/crm/core'
import { loadContacts } from '@/lib/crm/load'
import { demoContacts } from '@/lib/crm/demo'

export const dynamic = 'force-dynamic'
/** CSV of the caller's contacts (same filters as the list: q, status, source, tag, due=1). */
export async function GET(req: Request) {
  const g = await crmGuard(false); if (g.err) return g.err
  const sp = new URL(req.url).searchParams
  const all = g.demo ? demoContacts() : await loadContacts(g.user.id)
  const list = filterContacts(all, { q: sp.get('q') || '', status: sp.get('status') || '', source: sp.get('source') || '', tag: sp.get('tag') || '', due: sp.get('due') === '1' })
  return new Response('\uFEFF' + toCsv(list), { headers: {
    'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="clients-${new Date().toISOString().slice(0, 10)}.csv"`, 'cache-control': 'no-store' } })
}
