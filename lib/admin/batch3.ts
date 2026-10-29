// Pure helpers for admin batch 3 (CSV, churn, tool health, alerts). No I/O here so they are unit-testable.

/** RFC 4180 CSV; neutralises spreadsheet formula injection (=,+,-,@ prefixes). */
export function toCsv(header: string[], rows: unknown[][]): string {
  const cell = (v: unknown) => {
    let s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n'
}

export const EXPORT_KINDS = ['accounts', 'updates', 'audit', 'atrisk'] as const
export type ExportKind = (typeof EXPORT_KINDS)[number]
export const isExportKind = (k: unknown): k is ExportKind => typeof k === 'string' && (EXPORT_KINDS as readonly string[]).includes(k)

export type ChurnUser = { id: string; email: string; createdAt: string; lastSignInAt: string | null; tools: string[]; demo?: boolean }
export type AtRisk = ChurnUser & { reason: string; daysIdle: number | null }

/** Paying/active-tool users idle for `days`+ (or never signed in after a week). */
export function atRiskUsers(users: ChurnUser[], days = 21, now = Date.now()): AtRisk[] {
  const out: AtRisk[] = []
  for (const u of users) {
    if (u.demo || !u.tools.length) continue
    const ref = u.lastSignInAt ?? null
    const idle = ref ? Math.floor((now - Date.parse(ref)) / 864e5) : null
    const age = Math.floor((now - Date.parse(u.createdAt)) / 864e5)
    if (idle == null && age >= 7) out.push({ ...u, reason: 'Never signed in', daysIdle: null })
    else if (idle != null && idle >= days) out.push({ ...u, reason: `No sign-in for ${idle} days`, daysIdle: idle })
  }
  return out.sort((a, b) => (b.daysIdle ?? 1e9) - (a.daysIdle ?? 1e9))
}

export type ToolHealth = { key: string; label: string; total: number | null; last7: number | null; last30: number | null; errors7: number; status: 'healthy' | 'quiet' | 'errors' | 'unknown' }
export function healthStatus(t: Omit<ToolHealth, 'status'>): ToolHealth['status'] {
  if (t.total == null) return 'unknown'
  if (t.errors7 >= 5) return 'errors'
  if (t.last30 == null) return t.total ? 'healthy' : 'quiet'
  if (!t.last30) return 'quiet'
  return 'healthy'
}

/** Route fragments used to attribute app_errors rows to a tool. */
export const ERROR_ROUTE_HINTS: Record<string, string[]> = {
  funnels: ['/funnel', '/f/'], leads: ['/lead'], invoices: ['/invoice', '/i/'], forms: ['/form'], responses: ['/form'],
  proposals: ['/proposal'], testimonials: ['/testimonial'], bookings: ['/book'], linkinbio: ['/link', '/u/'],
  dataremoval: ['/removal', '/data-removal'], crm: ['/crm'], emaillist: ['/email-list', '/list'], downloads: ['/download', '/d/'], portal: ['/portal', '/p/'], changelog: ['/change-log', '/c/'], approvals: ['/approvals', '/a/'], orgs: ['/org'],
}
export const errorsForTool = (key: string, routes: string[]) => {
  const hints = ERROR_ROUTE_HINTS[key] ?? []
  return routes.filter((r) => hints.some((h) => (r ?? '').includes(h))).length
}

/** Admin alerts are BUILT DISABLED: computed for display only, never sent. Turning on sending needs owner approval + a sender. */
export const ALERTS_ENABLED = process.env.ADMIN_ALERTS_ENABLED === 'true'
export type Alert = { key: string; level: 'warn' | 'info'; text: string }
export function computeAlerts(i: { errors24h: number; signups7: number; signupsPrev7: number; atRisk: number; quietTools: string[] }): Alert[] {
  const a: Alert[] = []
  if (i.errors24h >= 10) a.push({ key: 'errors', level: 'warn', text: `${i.errors24h} app errors in the last 24 hours` })
  if (i.signupsPrev7 >= 5 && i.signups7 < i.signupsPrev7 / 2) a.push({ key: 'signups', level: 'warn', text: `Signups dropped: ${i.signups7} this week vs ${i.signupsPrev7} last week` })
  if (i.atRisk > 0) a.push({ key: 'atrisk', level: 'info', text: `${i.atRisk} paying account${i.atRisk === 1 ? '' : 's'} at risk of churning` })
  if (i.quietTools.length) a.push({ key: 'quiet', level: 'info', text: `No new items in 30 days: ${i.quietTools.join(', ')}` })
  return a
}
