// Canonical public marketing origin for sitemap, robots, canonical tags and JSON-LD.
// Deliberately ignores NEXT_PUBLIC_APP_URL (the app host, e.g. funnels.saasnation.site, which 301s to the apex).
export const CANONICAL_DEFAULT = 'https://saasnation.site'

export function canonicalSiteUrl(raw: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string {
  try {
    const u = new URL(raw || CANONICAL_DEFAULT)
    if (u.hostname === 'funnels.saasnation.site' || u.hostname === 'www.saasnation.site') u.hostname = 'saasnation.site'
    if (u.hostname === 'saasnation.site') u.protocol = 'https:'
    return u.origin
  } catch {
    return CANONICAL_DEFAULT
  }
}

export const SITE_URL = canonicalSiteUrl()
export const STATIC_PUBLIC_PATHS = ['/', '/pricing', '/templates', '/privacy', '/terms', '/refund']
