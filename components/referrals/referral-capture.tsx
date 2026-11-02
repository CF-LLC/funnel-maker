'use client'
import { useEffect } from 'react'
import { trackEvent } from '@/lib/site-events/client'

const COOKIE = 'sn_referral'
const DAYS = 30
const isCode = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9]{8}$/.test(v) && /[0-9]/.test(v)
const setCookie = (c: string) => { document.cookie = `${COOKIE}=${c}; Path=/; Max-Age=${60 * 60 * 24 * DAYS}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}` }

/** Stores a referral code from ?ref=<code> in a first-party cookie + localStorage (first code wins) so signup can be attributed. */
export function ReferralCapture() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(location.search).get('ref')
      const stored = localStorage.getItem(COOKIE)
      const hasCookie = new RegExp(`(?:^|; )${COOKIE}=`).test(document.cookie)
      if (isCode(ref) && !stored) { localStorage.setItem(COOKIE, ref); setCookie(ref); trackEvent('referral_landed') }
      else if (isCode(stored) && !hasCookie) setCookie(stored)
    } catch { /* never break the page */ }
  }, [])
  return null
}
