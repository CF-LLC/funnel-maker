// Sidebar groups by job (SaaS Nation rework PR 4, behind workspace_v2). Data-only; safe for client code.
import type { ToolDef } from './types'
import { TOOL_PRICE } from '@/lib/plans'

/** Section names and order are final (Product Lead). */
export const SIDEBAR_GROUPS = ['Get clients', 'Win work', 'Deliver', 'Get paid', 'Run the business'] as const
export type SidebarGroup = (typeof SIDEBAR_GROUPS)[number]

/** Every registry tool belongs to exactly one group (tests/sidebar-groups.test.cjs). */
export const TOOL_GROUP: Record<string, SidebarGroup> = {
  funnels: 'Get clients',
  linkinbio: 'Get clients',
  forms: 'Get clients',
  booking: 'Get clients',
  emaillist: 'Get clients',
  crm: 'Get clients',
  proposals: 'Win work',
  testimonials: 'Win work',
  portal: 'Deliver',
  approvals: 'Deliver',
  changelog: 'Deliver',
  time: 'Deliver',
  downloads: 'Deliver',
  invoices: 'Get paid',
  expenses: 'Get paid',
  paid: 'Get paid',
  reports: 'Run the business',
  dataremoval: 'Run the business',
}

/** Same rule as the dashboard page: All Access, the tool's own row, or (included tools) any active row. */
export function userHasTool(t: Pick<ToolDef, 'accessKey' | 'includedWithAnyPlan'>, active: readonly string[]): boolean {
  return active.includes('all') || active.includes(t.accessKey) || (!!t.includedWithAnyPlan && active.length > 0)
}

export type GroupedNavItem = { toolId: string; label: string; href: string; icon: ToolDef['nav'][number]['icon']; locked: boolean; price?: string }
export type GroupedNavSection = { name: SidebarGroup; items: GroupedNavItem[] }

/** Locked tools stay listed with a lock and the price, linking to /pricing (same as the dashboard upsell tiles). */
export const LOCKED_HREF = '/pricing'
export function lockedPrice(t: Pick<ToolDef, 'includedWithAnyPlan'>): string {
  return t.includedWithAnyPlan ? 'Free with any tool' : `${TOOL_PRICE.monthly}/mo`
}

export function groupedNav(tools: readonly ToolDef[], active: readonly string[]): GroupedNavSection[] {
  return SIDEBAR_GROUPS.map((name) => ({
    name,
    items: tools.filter((t) => TOOL_GROUP[t.id] === name).flatMap((t): GroupedNavItem[] => {
      if (userHasTool(t, active)) return t.nav.map((n) => ({ toolId: t.id, label: n.label, href: n.href, icon: n.icon, locked: false }))
      // One row per locked tool (not per nav entry), named by the tool.
      return [{ toolId: t.id, label: t.nav[0]?.label ?? t.name, href: LOCKED_HREF, icon: t.nav[0]?.icon ?? 'box', locked: true, price: lockedPrice(t) }]
    }),
  })).filter((s) => s.items.length > 0)
}
