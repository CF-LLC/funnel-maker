// SaaS Nation per-tool access. One row per (user, tool) in public.app_access; writes are admin-only (service role).
import { createServerClient } from '@/lib/supabase'

export const TOOLS = ['funnels', 'invoices'] as const
export type Tool = (typeof TOOLS)[number]
export const ACCESS_SOURCES = ['founding', 'single', 'all_access', 'manual'] as const
export type AccessSource = (typeof ACCESS_SOURCES)[number]

/** 'all' = All Access: one row that covers every tool, including future ones. */
export const ACCESS_TOOLS = ['funnels', 'invoices', 'all'] as const
export type AccessTool = (typeof ACCESS_TOOLS)[number]

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
  const { data } = await (supabase as any)
    .from('app_access').select('tool').eq('user_id', user.id).in('tool', [tool, 'all']).eq('active', true).limit(1)
  return Array.isArray(data) && data.length > 0
}

/** Same check for the currently signed-in user. */
export async function currentUserHasAccess(tool: Tool): Promise<{ userId: string | null; allowed: boolean }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { userId: user?.id ?? null, allowed: await hasAccess(user, tool) }
}
