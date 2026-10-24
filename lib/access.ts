// SaaS Nation per-tool access. One row per (user, tool) in public.app_access; writes are admin-only (service role).
import { createServerClient } from '@/lib/supabase'

import { isIncludedTool, TOOL_IDS, ACCESS_KEYS, type ToolId, type ALL_ACCESS } from '@/tools/registry'

/** Derived from tools/registry.ts. */
export const TOOLS: readonly ToolId[] = TOOL_IDS
export type Tool = ToolId
export const ACCESS_SOURCES = ['founding', 'single', 'all_access', 'manual'] as const
export type AccessSource = (typeof ACCESS_SOURCES)[number]

/** 'all' = All Access: one row that covers every tool, including future ones. */
export const ACCESS_TOOLS: readonly (ToolId | typeof ALL_ACCESS)[] = ACCESS_KEYS
export type AccessTool = ToolId | typeof ALL_ACCESS

export function isTool(v: unknown): v is Tool {
  return typeof v === 'string' && (TOOLS as readonly string[]).includes(v)
}
export function isAccessTool(v: unknown): v is AccessTool {
  return typeof v === 'string' && (ACCESS_TOOLS as readonly string[]).includes(v)
}

/** True if the user has an active row for the tool or an active All Access ('all') row. Reads with the user's session (RLS: own rows). */
export async function hasAccess(user: { id: string } | null | undefined, tool: Tool): Promise<boolean> {
  if (!user?.id) return false
  const supabase = await createServerClient()
  let q = (supabase as any).from('app_access').select('tool').eq('user_id', user.id).eq('active', true)
  // Included tools (Link-in-bio): any active row on any tool counts.
  if (!isIncludedTool(tool)) q = q.in('tool', [tool, 'all'])
  const { data } = await q.limit(1)
  return Array.isArray(data) && data.length > 0
}

/** Same check for the currently signed-in user. */
export async function currentUserHasAccess(tool: Tool): Promise<{ userId: string | null; allowed: boolean }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { userId: user?.id ?? null, allowed: await hasAccess(user, tool) }
}
