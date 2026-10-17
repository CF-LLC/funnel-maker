import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase'

/** Service-role client. Server-only; never import from client components. */
export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('SUPABASE_SECRET_KEY is not set')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** Returns the signed-in user's id if they're in admin_users, else null. */
export async function currentAdminId(): Promise<string | null> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await (supabase as any).rpc('fm_is_admin', { uid: user.id })
  return data === true ? user.id : null
}
