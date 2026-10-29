'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const COOKIE = 'sn_vid'
// Never track our users' client-facing pages (private token links, public proposals/invoices/booking): only our own site.
const SKIP = /^\/(dashboard|admin|api|auth|f|d|e|i|s|u|a|c|p|booking|updates)(\/|$)/
const REFS = ['approvals', 'changelog', 'portal', 'proposals', 'invoices', 'booking']
/** Calls to action worth counting: signup, pricing and Stripe checkout links. */
const isCta = (href: string) => /^\/(auth\/register|pricing)(\/|\?|#|$)/.test(href) || href.startsWith('https://buy.stripe.com/')

function visitorId(): string {
  let vid = document.cookie.match(/(?:^|; )sn_vid=([^;]+)/)?.[1]
  if (!vid) {
    vid = crypto.randomUUID()
    document.cookie = `${COOKIE}=${vid}; Path=/; Max-Age=${60 * 60 * 24 * 90}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
  }
  return vid
}
const send = (o: Record<string, unknown>) => fetch('/api/track', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(o), keepalive: true }).catch(() => {})
const sessionRef = () => { try { return sessionStorage.getItem('sn_ref') } catch { return null } }

/** Sends one anonymous beacon per page per session: the landing page (with UTM tags / ?ref) and each free tool opened; plus CTA clicks. Respects Do-Not-Track. */
export function Beacon() {
  const path = usePathname()
  useEffect(() => {
    if (!path || SKIP.test(path) || navigator.doNotTrack === '1') return
    const isTool = path.startsWith('/free-tools/')
    const seenKey = isTool ? `sn_t:${path}` : 'sn_landed'
    try { if (sessionStorage.getItem(seenKey)) return; sessionStorage.setItem(seenKey, '1') } catch { return }
    const q = new URLSearchParams(location.search)
    const ref = q.get('ref')
    if (ref && REFS.includes(ref)) try { sessionStorage.setItem('sn_ref', ref) } catch {}
    send({ vid: visitorId(), path, utm_source: q.get('utm_source'), utm_medium: q.get('utm_medium'), utm_campaign: q.get('utm_campaign'), ref: sessionRef() })
  }, [path])
  // Anonymous CTA clicks (signup / pricing / checkout links) on our own pages. Same opt-outs as above.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (navigator.doNotTrack === '1' || SKIP.test(location.pathname)) return
      const a = (e.target as HTMLElement | null)?.closest?.('a')
      const href = a?.getAttribute('href') || ''
      if (!isCta(href)) return
      send({ kind: 'cta', vid: visitorId(), path: location.pathname, ref: sessionRef() })
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])
  return null
}
