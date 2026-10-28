// Runtime feature flags (public.feature_flags). Default off.
import { createClient } from '@supabase/supabase-js'
import { LAUNCH_FLAGS, LAUNCH_FLAG_KEYS } from '@/tools/registry'
import type { LaunchFlag } from '@/tools/types'
import { crmPublic } from '@/lib/admin/core'

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
