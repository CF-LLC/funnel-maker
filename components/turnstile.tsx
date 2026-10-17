'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string; remove: (id: string) => void }
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

/** Renders the Turnstile widget when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set; renders nothing otherwise. */
export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!SITE_KEY || !ref.current) return
    let id: string | undefined
    const mount = () => {
      if (window.turnstile && ref.current && !id) {
        id = window.turnstile.render(ref.current, { sitekey: SITE_KEY, callback: onToken, 'expired-callback': () => onToken('') })
      }
    }
    if (window.turnstile) mount()
    else {
      const s = document.createElement('script')
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      s.async = true
      s.onload = mount
      document.head.appendChild(s)
    }
    return () => { if (id && window.turnstile) window.turnstile.remove(id) }
  }, [onToken])
  return SITE_KEY ? <div ref={ref} className="my-2" /> : null
}

export const turnstileSiteKeySet = !!SITE_KEY
