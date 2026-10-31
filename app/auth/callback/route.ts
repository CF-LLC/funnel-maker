import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { safeReturnPath } from '@/lib/safe-redirect'
import { serviceClient } from '@/lib/server/admin-client'
import { ensureProfile } from '@/lib/server/ensure-profile'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')
  const next = safeReturnPath(requestUrl.searchParams.get('next') ?? requestUrl.searchParams.get('redirectTo'))

  if (code) {
    const supabase = await createServerClient()
    const { data } = await supabase.auth.exchangeCodeForSession(code)
    // Fallback: never strand a confirmed user without a profile row.
    if (data?.user) {
      try { await ensureProfile(serviceClient(), data.user) } catch (e) { console.error('ensure-profile (callback)', e) }
    }
  }

  // If this is a password recovery, redirect to update password page
  if (type === 'recovery') {
    const redirectUrl = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin
    return NextResponse.redirect(new URL('/auth/update-password', redirectUrl))
  }

  // URL to redirect to after sign in process completes
  const redirectUrl = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin
  return NextResponse.redirect(new URL(next, redirectUrl))
}
