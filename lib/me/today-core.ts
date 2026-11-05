// Today panel (workspace_v2): pure item builder. No I/O. Real counts only; zero = row hidden.
import { formatCurrency } from '@/lib/invoices/core'

export type TodayTool = 'invoices' | 'proposals' | 'booking' | 'approvals' | 'changelog' | 'funnels' | 'forms' | 'time' | 'expenses'
export const TODAY_TOOLS: readonly TodayTool[] = ['invoices', 'proposals', 'booking', 'approvals', 'changelog', 'funnels', 'forms', 'time', 'expenses']

/** Raw numbers from the loader. A missing key = that tool's query failed or the tool is not available. */
export type TodayCounts = Partial<{
  overdue: { count: number; byCurrency: Record<string, number> }
  proposalsSent: number
  bookingsSoon: number
  approvalChanges: number
  leads7d: number
  responses7d: number
  unbilledSeconds: number
  unbilledTimeEntries: number
  unbilledExpenses: { count: number; cents: number }
  changesReady: number
}>

export type TodayItem = { id: string; tool: TodayTool; text: string; href: string; cta: string }
export const TODAY_EMPTY = { text: 'Nothing needs you today.', cta: 'Create your first client', href: '/crm/new' }
/** Empty-state next step. Has a client already = neutral "Add a client". No Clients tool = invoice clients, else pricing. */
export function todayEmpty(hasClient: boolean, access: ReadonlySet<string>) {
  const href = access.has('crm') ? '/crm/new' : access.has('invoices') ? '/invoices/clients' : '/pricing'
  return { text: TODAY_EMPTY.text, cta: hasClient ? 'Add a client' : TODAY_EMPTY.cta, href }
}

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`
const money = (by: Record<string, number>) => Object.entries(by).filter(([, c]) => c > 0).sort().map(([cur, c]) => formatCurrency(c, cur)).join(' + ')
const hrs = (s: number) => `${Math.round((s / 3600) * 10) / 10}`

/** Items in display order (money first), only for tools in `access`, only when the count is above zero. */
export function buildToday(c: TodayCounts, access: ReadonlySet<string>): TodayItem[] {
  const out: TodayItem[] = []
  const add = (tool: TodayTool, id: string, n: number | undefined, text: () => string, href: string, cta: string) => {
    if (access.has(tool) && typeof n === 'number' && n > 0) out.push({ id, tool, text: text(), href, cta })
  }
  const o = c.overdue
  add('invoices', 'overdue', o?.count, () => `${plural(o!.count, 'invoice')} overdue${money(o!.byCurrency) ? `, ${money(o!.byCurrency)} unpaid` : ''}`, '/invoices', 'See invoices')
  add('proposals', 'proposals', c.proposalsSent, () => `${plural(c.proposalsSent!, 'proposal')} sent and waiting for a reply`, '/proposals', 'See proposals')
  add('booking', 'bookings', c.bookingsSoon, () => `${plural(c.bookingsSoon!, 'booking')} in the next 2 days`, '/booking', 'See bookings')
  add('approvals', 'approvals', c.approvalChanges, () => `${plural(c.approvalChanges!, 'client')} asked for changes on an approval`, '/approvals', 'See approvals')
  add('funnels', 'leads', c.leads7d, () => `${plural(c.leads7d!, 'new funnel lead')} in the last 7 days`, '/funnels', 'See funnels')
  add('forms', 'responses', c.responses7d, () => `${plural(c.responses7d!, 'new form response')} in the last 7 days`, '/forms', 'See forms')
  add('time', 'time', c.unbilledTimeEntries, () => `${hrs(c.unbilledSeconds || 0)} h of billable time not invoiced yet`, '/time', 'Invoice time')
  const x = c.unbilledExpenses
  add('expenses', 'expenses', x?.count, () => `${plural(x!.count, 'billable expense')} not invoiced yet (${formatCurrency(x!.cents)})`, '/expenses', 'Invoice expenses')
  add('changelog', 'changes', c.changesReady, () => `${plural(c.changesReady!, 'approved change request')} ready to invoice`, '/change-log', 'See change log')
  return out
}
