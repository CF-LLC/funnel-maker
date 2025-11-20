import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createServerClient()
    await supabase.auth.exchangeCodeForSession(code)
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
