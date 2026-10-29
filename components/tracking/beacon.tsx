'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const COOKIE = 'sn_vid'
const SKIP = /^\/(dashboard|admin|api|auth|f|d|e|i|s|u|booking|updates)(\/|$)/

/** Sends one anonymous beacon per page per session: the landing page (with UTM tags) and each free tool opened. */
export function Beacon() {
  const path = usePathname()
  useEffect(() => {
    if (!path || SKIP.test(path) || navigator.doNotTrack === '1') return
    const isTool = path.startsWith('/free-tools/')
    const seenKey = isTool ? `sn_t:${path}` : 'sn_landed'
    try { if (sessionStorage.getItem(seenKey)) return; sessionStorage.setItem(seenKey, '1') } catch { return }
    let vid = document.cookie.match(/(?:^|; )sn_vid=([^;]+)/)?.[1]
    if (!vid) {
      vid = crypto.randomUUID()
      document.cookie = `${COOKIE}=${vid}; Path=/; Max-Age=${60 * 60 * 24 * 90}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
    }
    const q = new URLSearchParams(location.search)
    const body = JSON.stringify({ vid, path, utm_source: q.get('utm_source'), utm_medium: q.get('utm_medium'), utm_campaign: q.get('utm_campaign') })
    fetch('/api/track', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {})
  }, [path])
  return null
}
