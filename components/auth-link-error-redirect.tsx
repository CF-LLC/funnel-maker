'use client'

import { useEffect } from 'react'

/** Supabase puts email-link errors (e.g. otp_expired) in the URL hash; route them to login so users see a resend option. */
export function AuthLinkErrorRedirect() {
  useEffect(() => {
    const hash = window.location.hash
    if (!hash.includes('error_code=') && !hash.includes('error=')) return
    if (window.location.pathname === '/auth/login') return
    window.location.replace('/auth/login' + hash)
  }, [])
  return null
}
