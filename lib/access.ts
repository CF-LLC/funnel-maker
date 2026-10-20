// SaaS Nation per-tool access. One row per (user, tool) in public.app_access; writes are admin-only (service role).
import { createServerClient } from '@/lib/supabase'

export const TOOLS = ['funnels', 'invoices'] as const
export type Tool = (typeof TOOLS)[number]
export const ACCESS_SOURCES = ['founding', 'single', 'all_access', 'manual'] as const
export type AccessSource = (typeof ACCESS_SOURCES)[number]

export function isTool(v: unknown): v is Tool {
  return typeof v === 'string' && (TOOLS as readonly string[]).includes(v)
}

/** True if the user has an active app_access row for the tool. Reads with the user's own session (RLS: own rows). */
export async function hasAccess(user: { id: string } | null | undefined, tool: Tool): Promise<boolean> {
  if (!user?.id) return false
  const supabase = await createServerClient()
  const { data } = await (supabase as any)
    .from('app_access').select('active').eq('user_id', user.id).eq('tool', tool).eq('active', true).maybeSingle()
  return !!data
}

/** Same check for the currently signed-in user. */
export async function currentUserHasAccess(tool: Tool): Promise<{ userId: string | null; allowed: boolean }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { userId: user?.id ?? null, allowed: await hasAccess(user, tool) }
}
