// URL checks for user-supplied links. Used in the editor (inline hints) and again at render time,
// so a link saved through any client is never rendered unless it passes.

function parse(u: unknown): URL | null {
  if (typeof u !== 'string' || u.length > 2000) return null
  try {
    const url = new URL(u.trim())
    return url.protocol === 'https:' && !url.username && !url.password ? url : null
  } catch {
    return null
  }
}

const hostIs = (h: string, d: string) => h === d || h.endsWith('.' + d)

export function safeHttpsUrl(u: unknown): string | null {
  return parse(u)?.toString() ?? null
}

/** Calendly or Cal.com only. */
export function safeBookingUrl(u: unknown): string | null {
  const url = parse(u)
  if (!url) return null
  const h = url.hostname.toLowerCase()
  return hostIs(h, 'calendly.com') || hostIs(h, 'cal.com') ? url.toString() : null
}

/** The seller's own Stripe Payment Link (https://buy.stripe.com/...). */
export function safePaymentLink(u: unknown): string | null {
  const url = parse(u)
  return url && url.hostname.toLowerCase() === 'buy.stripe.com' ? url.toString() : null
}

/** Download links: any https URL (incl. our Supabase Storage public URLs). */
export const safeDownloadUrl = safeHttpsUrl

/** CSS color: hex, rgb(a)/hsl(a), simple names, or a linear-gradient of those. Anything else is dropped. */
export function safeCssColor(v: unknown): string | undefined {
  if (typeof v !== 'string' || v.length > 200) return undefined
  return /^[#a-zA-Z0-9(),.%\s-]+$/.test(v) && !/url\s*\(|expression|;/i.test(v) ? v : undefined
}

export function starterSitesUrl(template?: string | null): string {
  const base = process.env.NEXT_PUBLIC_STARTER_SITES_URL || 'https://cf-llc.github.io/' /* placeholder until Cooper sets the real URL */
  const url = new URL(base)
  url.searchParams.set('ref', 'funnel-maker')
  url.searchParams.set('tpl', template || 'none')
  return url.toString()
}
