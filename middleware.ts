import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if needed - this is important for maintaining login
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes that require authentication
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/auth/login'
      redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Check if user is admin (admins bypass all billing restrictions)
    const { data: adminCheck } = await (supabase
      .from('admin_users') as any)
      .select('id')
      .eq('id', user.id)
      .single()

    const isAdmin = !!adminCheck

    // Check subscription status for billing gates (skip for admins)
    if (user && !isAdmin) {
      const { data: subscription } = await (supabase
        .from('subscriptions') as any)
        .select('*')
        .eq('user_id', user.id)
        .single()

      const plan = subscription?.plan || 'free'
      const status = subscription?.status || 'active'

      // Check if subscription is expired
      if (subscription && status !== 'active' && !request.nextUrl.pathname.includes('/billing')) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/dashboard/billing'
        return NextResponse.redirect(redirectUrl)
      }

      // Add subscription info to response headers for use in components
      response.headers.set('x-user-plan', plan)
      response.headers.set('x-user-subscription-status', status)
    } else if (isAdmin) {
      // Set admin plan headers
      response.headers.set('x-user-plan', 'enterprise')
      response.headers.set('x-user-subscription-status', 'active')
    }
  }

  // Public routes - allow access
  const publicPaths = ['/', '/auth', '/pricing', '/templates', '/marketing', '/api/billing/webhook']
  const isPublicPath = publicPaths.some((path) => request.nextUrl.pathname.startsWith(path))

  if (isPublicPath) {
    return response
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
