// SaaS Nation moved from funnels.saasnation.site to saasnation.site.
export const LEGACY_HOST = 'funnels.saasnation.site'
export const CANONICAL_ORIGIN = 'https://saasnation.site'
const BOTH_HOSTS = ['/api/stripe/webhook', '/healthz']

/** 301 target for requests on the old funnels.saasnation.site host, or null to serve normally. */
export function legacyHostRedirect(host: string | null, pathname: string, search: string): string | null {
  const h = (host || '').split(',')[0].trim().toLowerCase().replace(/:\d+$/, '')
  if (h !== LEGACY_HOST) return null
  if (BOTH_HOSTS.some((p) => pathname === p || pathname.startsWith(p + '/'))) return null
  return CANONICAL_ORIGIN + pathname + search
}

