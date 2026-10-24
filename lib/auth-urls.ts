// Absolute URL for Supabase Auth email links (signup confirmation, magic link, password reset).
// Always the public site, never window.location, so links can't point at localhost or a preview host.
// Supabase must allowlist it: Authentication -> URL Configuration -> Redirect URLs.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://saasnation.site').replace(/\/+$/, '')

export function authCallbackUrl(params?: Record<string, string>): string {
  const url = new URL('/auth/callback', SITE_URL)
  for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, v)
  return url.toString()
}
