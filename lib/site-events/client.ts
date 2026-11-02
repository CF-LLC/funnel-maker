'use client'
// Browser side of the cookieless site analytics. No cookies, no storage of ids. Honors DNT / GPC.
import { PAYMENT_LINKS } from '@/lib/plans'

export function optedOutBrowser(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.doNotTrack === '1' || (navigator as any).globalPrivacyControl === true || (window as any).doNotTrack === '1'
}

export function trackEvent(event: string, extra: Record<string, unknown> = {}): void {
  if (optedOutBrowser()) return
  try {
    const body = JSON.stringify({ event, path: location.pathname, ...extra })
    if (navigator.sendBeacon && navigator.sendBeacon('/api/e', new Blob([body], { type: 'application/json' }))) return
    fetch('/api/e', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {})
  } catch { /* never break the page */ }
}

/** Which tool / plan a Stripe Payment Link belongs to, from our own (public) link map. */
export function checkoutFromHref(href: string, links: Record<string, Record<string, string | undefined>> = PAYMENT_LINKS): { tool: string; plan: string } | null {
  if (!href.startsWith('https://buy.stripe.com/')) return null
  const base = href.split(/[?#]/)[0]
  for (const [tool, byPlan] of Object.entries(links)) for (const [plan, url] of Object.entries(byPlan)) if (url && url.split(/[?#]/)[0] === base) return { tool, plan }
  return { tool: 'unknown', plan: 'unknown' }
}
