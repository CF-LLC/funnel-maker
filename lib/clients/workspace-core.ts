// Client page v2 (workspace_v2): pure section shapes and helpers. No I/O.
import type { Tool } from '@/lib/access'

export const WS_ROWS = 5

export type WsRow = { id: string; title: string; href: string; at: string | null; meta?: string | null }
export type WsSection = {
  tool: Tool
  label: string
  href: string            // tool home
  count: number           // linked items (by email)
  rows: WsRow[]           // latest, at most WS_ROWS
  unlinked: number        // this tool's items with no email (never guessed by name)
  status?: string | null  // e.g. email-list status
  empty: string
}

/** Tools shown on the v2 client page, in display order. */
export const WS_TOOLS = ['portal', 'time', 'expenses', 'approvals', 'changelog', 'downloads', 'reports', 'emaillist'] as const satisfies readonly Tool[]
export type WsTool = (typeof WS_TOOLS)[number]

export const WS_META: Record<WsTool, { label: string; href: string; empty: string }> = {
  portal: { label: 'Client portal', href: '/portal', empty: 'No portal for this client yet.' },
  time: { label: 'Time', href: '/time', empty: 'No time tracked for this client yet.' },
  expenses: { label: 'Expenses', href: '/expenses', empty: 'No expenses tagged to this client yet.' },
  approvals: { label: 'Approvals', href: '/approvals', empty: 'Nothing sent for approval yet.' },
  changelog: { label: 'Change log', href: '/change-log', empty: 'No change requests yet.' },
  downloads: { label: 'Downloads', href: '/digital-downloads/orders', empty: 'No purchases with this email.' },
  reports: { label: 'Reports', href: '/reports', empty: 'No client reports yet.' },
  emaillist: { label: 'Email list', href: '/email-list', empty: 'Not on your email list.' },
}

export function section(tool: WsTool, p: { count?: number | null; rows?: WsRow[]; unlinked?: number | null; status?: string | null }): WsSection {
  const m = WS_META[tool]
  const rows = (p.rows || []).filter((r) => r && r.id).sort((a, b) => ((a.at || '') < (b.at || '') ? 1 : -1)).slice(0, WS_ROWS)
  return { tool, label: m.label, href: m.href, empty: m.empty, count: Math.max(p.count ?? 0, rows.length), rows, unlinked: Math.max(0, p.unlinked ?? 0), status: p.status ?? null }
}

/** Only tools the viewer can open, in WS_TOOLS order. */
export function visibleTools(access: ReadonlySet<string>): WsTool[] {
  return WS_TOOLS.filter((t) => access.has(t))
}

export const hours = (seconds: number) => `${(Math.round((seconds / 3600) * 100) / 100).toFixed(2)} h`
