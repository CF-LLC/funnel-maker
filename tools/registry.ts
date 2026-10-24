// THE single list of SaaS Nation tools. Pricing, dashboard home, sidebar, middleware, admin access,
// hasAccess() and the Stripe price map all derive from this. See docs/ADDING_A_TOOL.md.
import type { ToolDef } from './types'
import { funnelsTool } from './funnels/tool'
import { invoicesTool } from './invoices/tool'
import { linkinbioTool } from './linkinbio/tool'

export const TOOL_REGISTRY = [funnelsTool, invoicesTool, linkinbioTool] as const satisfies readonly ToolDef[]
export type ToolId = (typeof TOOL_REGISTRY)[number]['id']
export const TOOL_IDS = TOOL_REGISTRY.map((t) => t.id) as ToolId[]
/** 'all' = All Access, one app_access row covering every tool. */
export const ALL_ACCESS = 'all' as const
export const ACCESS_KEYS = [...TOOL_IDS, ALL_ACCESS] as (ToolId | typeof ALL_ACCESS)[]

export function getTool(id: string): ToolDef | undefined {
  return (TOOL_REGISTRY as readonly ToolDef[]).find((t) => t.id === id)
}
export const PROTECTED_PATHS: string[] = Array.from(new Set((TOOL_REGISTRY as readonly ToolDef[]).flatMap((t) => t.protectedPaths)))
export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}
