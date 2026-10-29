// THE single list of SaaS Nation tools. Pricing, dashboard home, sidebar, middleware, admin access,
// hasAccess() and the Stripe price map all derive from this. See docs/ADDING_A_TOOL.md.
import type { ToolDef } from './types'
import { funnelsTool } from './funnels/tool'
import { invoicesTool } from './invoices/tool'
import { linkinbioTool } from './linkinbio/tool'
import { formsTool } from './forms/tool'
import { proposalsTool } from './proposals/tool'
import { testimonialsTool } from './testimonials/tool'
import { bookingTool } from './booking/tool'
import { dataremovalTool } from './dataremoval/tool'
import { crmTool } from './crm/tool'
import { emaillistTool } from './emaillist/tool'
import { downloadsTool } from './downloads/tool'
import { portalTool } from './portal/tool'
import { changelogTool } from './changelog/tool'

export const TOOL_REGISTRY = [funnelsTool, invoicesTool, linkinbioTool, formsTool, proposalsTool, testimonialsTool, bookingTool, dataremovalTool, crmTool, emaillistTool, downloadsTool, portalTool, changelogTool] as const satisfies readonly ToolDef[]
export type ToolId = (typeof TOOL_REGISTRY)[number]['id']
export const TOOL_IDS = TOOL_REGISTRY.map((t) => t.id) as ToolId[]
/** 'all' = All Access, one app_access row covering every tool. */
export const ALL_ACCESS = 'all' as const
export const ACCESS_KEYS = [...TOOL_IDS, ALL_ACCESS] as (ToolId | typeof ALL_ACCESS)[]

/** Tools that can be priced/granted on their own (STRIPE_PRICE_MAP, admin tabs). */
export const SOLD_TOOL_IDS = (TOOL_REGISTRY as readonly ToolDef[]).filter((t) => !t.includedWithAnyPlan).map((t) => t.id) as ToolId[]
export const SOLD_ACCESS_KEYS = [...SOLD_TOOL_IDS, ALL_ACCESS] as (ToolId | typeof ALL_ACCESS)[]
export const isIncludedTool = (id: string) => !!(TOOL_REGISTRY as readonly ToolDef[]).find((t) => t.id === id)?.includedWithAnyPlan

/** Launch flags. NEXT_PUBLIC_* must be referenced literally so Next inlines them. Default off. */
const on = (v: string | undefined) => ['1', 'true'].includes(String(v || '').toLowerCase())
export const LAUNCH_FLAGS: Record<import('./types').LaunchFlag, boolean> = {
  crm: on(process.env.NEXT_PUBLIC_CRM_ENABLED),
  emaillist: on(process.env.NEXT_PUBLIC_EMAILLIST_ENABLED),
  downloads: on(process.env.NEXT_PUBLIC_DOWNLOADS_ENABLED),
  portal: on(process.env.NEXT_PUBLIC_PORTAL_ENABLED),
  changelog: on(process.env.NEXT_PUBLIC_CHANGELOG_ENABLED),
}
export const LAUNCH_FLAG_KEYS = Object.keys(LAUNCH_FLAGS) as import('./types').LaunchFlag[]
export function isToolLaunched(t: Pick<ToolDef, 'launchFlag'>, flags: Record<string, boolean> = LAUNCH_FLAGS): boolean {
  return !t.launchFlag || !!flags[t.launchFlag]
}
/** Tools shown on public/dashboard surfaces (home rows, dashboard cards and nav, tool lists). */
export const PUBLIC_TOOLS: readonly ToolDef[] = (TOOL_REGISTRY as readonly ToolDef[]).filter((t) => isToolLaunched(t))
/** Same, with runtime flags (lib/flags getLaunchFlags / useLaunchFlags). */
export function publicTools(flags: Record<string, boolean> = LAUNCH_FLAGS): ToolDef[] {
  return (TOOL_REGISTRY as readonly ToolDef[]).filter((t) => isToolLaunched(t, flags))
}

export function getTool(id: string): ToolDef | undefined {
  return (TOOL_REGISTRY as readonly ToolDef[]).find((t) => t.id === id)
}
export const PROTECTED_PATHS: string[] = Array.from(new Set((TOOL_REGISTRY as readonly ToolDef[]).flatMap((t) => t.protectedPaths)))
export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export type { ToolRow } from './types'
/** Rows on the public home, in order. Driven by each tool's showcase.rows. */
export const HOME_ROWS: { id: 'all' | import('./types').ToolRow; title: string }[] = [
  { id: 'all', title: 'All tools' },
  { id: 'coaches', title: 'For coaches' },
  { id: 'creators', title: 'For creators' },
  { id: 'get-paid', title: 'Get paid' },
  { id: 'everyone', title: 'For everyone' },
]
export function toolsInRow(row: 'all' | import('./types').ToolRow, flags: Record<string, boolean> = LAUNCH_FLAGS): ToolDef[] {
  const list = publicTools(flags).sort((a, b) => a.showcase.order - b.showcase.order)
  return row === 'all' ? list : list.filter((t) => t.showcase.rows.includes(row))
}
/** Tool featured in the public home hero. */
export const HERO_TOOL_ID = 'funnels'
