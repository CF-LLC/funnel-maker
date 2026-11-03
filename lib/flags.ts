// Runtime feature flags (public.feature_flags). Default off.
import { createClient } from '@supabase/supabase-js'
import { LAUNCH_FLAGS, LAUNCH_FLAG_KEYS } from '@/tools/registry'
import type { LaunchFlag } from '@/tools/types'
import { crmPublic } from '@/lib/admin/core'
import { createServerClient } from '@/lib/supabase'

/** Reads a public (*_public) flag via the fm_public_flag RPC with the anon key. Any failure = false. */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return false
  try {
    const db = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await db.rpc('fm_public_flag', { flag_key: key })
    return !error && data === true
  } catch {
    return false
  }
}

/** Effective launch flags: NEXT_PUBLIC_* build env OR the runtime public flag. */
export async function getLaunchFlags(): Promise<Record<LaunchFlag, boolean>> {
  const vals = await Promise.all(LAUNCH_FLAG_KEYS.map(async (k) => crmPublic(LAUNCH_FLAGS[k], LAUNCH_FLAGS[k] ? true : await isFeatureEnabled(`${k}_public`))))
  return Object.fromEntries(LAUNCH_FLAG_KEYS.map((k, i) => [k, vals[i]])) as Record<LaunchFlag, boolean>
}

/** Pure per-user flag rule (mirrors public.fm_user_flag): on for everyone, or on for allowlisted user ids. */
export function flagAllows(row: { enabled?: boolean | null; allow_users?: string[] | null } | null | undefined, userId: string | null | undefined): boolean {
  if (!row) return false
  if (row.enabled === true) return true
  return !!userId && Array.isArray(row.allow_users) && row.allow_users.includes(userId)
}

/** Allowlist edit: returns the new list (deduped), never touching other ids. */
export function editAllowlist(list: string[] | null | undefined, userId: string, allow: boolean): string[] {
  const cur = Array.isArray(list) ? list.filter((x) => typeof x === 'string') : []
  const rest = cur.filter((x) => x !== userId)
  return allow ? [...rest, userId] : rest
}

const USER_FLAG_TTL_MS = 60_000
const userFlagCache = new Map<string, { v: boolean; exp: number }>()
/** Per-user runtime flag via the fm_user_flag RPC with the user's session. Cached 60s per (key, user). Any failure = false. */
export async function isUserFlagEnabled(key: string, userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false
  const ck = `${key}:${userId}`
  const hit = userFlagCache.get(ck)
  if (hit && hit.exp > Date.now()) return hit.v
  let v = false
  try {
    const db: any = await createServerClient()
    const { data, error } = await db.rpc('fm_user_flag', { flag_key: key })
    v = !error && data === true
  } catch { v = false }
  userFlagCache.set(ck, { v, exp: Date.now() + USER_FLAG_TTL_MS })
  return v
}
export const _resetUserFlagCache = () => userFlagCache.clear()
