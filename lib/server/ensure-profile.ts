import type { SupabaseClient } from '@supabase/supabase-js'

const TEMPLATES = ['book-call', 'sales-page', 'free-download']

export type ProfileUser = { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }

/** Row the DB trigger fm_handle_new_user would have created. Pure, for tests. */
export function profileRowFor(user: ProfileUser) {
  const meta = user.user_metadata || {}
  const tpl = typeof meta.template === 'string' && TEMPLATES.includes(meta.template) ? meta.template : null
  const wishRaw = typeof meta.wish_tool === 'string' ? meta.wish_tool.trim().slice(0, 500) : ''
  return { id: user.id, email: user.email || '', signup_template: tpl, wish_tool: wishRaw || null }
}

/**
 * Idempotently make sure public.users has a row for this auth user.
 * Must be called with a service-role client (server only). Never overwrites an existing row.
 */
export async function ensureProfile(admin: SupabaseClient, user: ProfileUser): Promise<{ created: boolean; error?: string }> {
  if (!user?.id || !user.email) return { created: false, error: 'missing user' }
  const { data: existing, error: selErr } = await admin.from('users').select('id').eq('id', user.id).maybeSingle()
  if (selErr) return { created: false, error: selErr.message }
  if (existing) return { created: false }
  const { error } = await admin.from('users').upsert(profileRowFor(user), { onConflict: 'id', ignoreDuplicates: true })
  if (error) return { created: false, error: error.message }
  return { created: true }
}
