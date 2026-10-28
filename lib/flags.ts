// Runtime feature flags (public.feature_flags). Default off.
import { createClient } from '@supabase/supabase-js'
import { LAUNCH_FLAGS } from '@/tools/registry'
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
export async function getLaunchFlags(): Promise<Record<'crm', boolean>> {
  return { crm: crmPublic(LAUNCH_FLAGS.crm, LAUNCH_FLAGS.crm ? true : await isFeatureEnabled('crm_public')) }
}
