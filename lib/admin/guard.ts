// Server-only. Admin gate for /admin pages and /api/admin routes.
import { NextResponse } from 'next/server'
import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'

/** Signed-in user id if they are an admin (fm_is_admin), else null; also reports whether anyone is signed in. */
export async function adminState(): Promise<{ userId: string | null; adminId: string | null }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { userId: null, adminId: null }
  const { data } = await (supabase as any).rpc('fm_is_admin', { uid: user.id })
  return { userId: user.id, adminId: data === true ? user.id : null }
}

const NOT_FOUND = () => NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } })

/** For /api/admin/*: returns the admin id, or a 404 response for anyone else (signed out included). */
export async function adminApiGuard(): Promise<{ adminId: string; res?: undefined } | { adminId?: undefined; res: NextResponse }> {
  const { adminId } = await adminState()
  return adminId ? { adminId } : { res: NOT_FOUND() }
}

/** For /admin pages: signed out -> login, non-admin -> 404. */
export async function requireAdminPage(path = '/admin'): Promise<string> {
  const { userId, adminId } = await adminState()
  if (!userId) redirect(`/auth/login?redirectTo=${encodeURIComponent(path)}`)
  if (!adminId) notFound()
  return adminId
}
