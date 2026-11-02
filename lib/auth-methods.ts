// Extra sign-in methods (Google OAuth, email link / one-time code). Pure helpers, safe for client + tests.

/** Google button only renders when ops set NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED=true AND enabled the provider in Supabase Auth. */
export const googleLoginEnabled = process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED === 'true'

/** Supabase email OTPs are 6-10 digits (this project sends 8) (configurable up to 10). Accept 6-10 digits, ignore spaces. */
export function normalizeOtpCode(raw: string): string | null {
  const c = (raw || '').replace(/[\s-]/g, '')
  return /^\d{6,10}$/.test(c) ? c : null
}

/** A user whose auth account was created in the last `minutes` is treated as a brand-new signup (for analytics). */
export function isNewUser(user: { created_at?: string | null } | null | undefined, now = Date.now(), minutes = 60): boolean {
  const t = user?.created_at ? Date.parse(user.created_at) : NaN
  return Number.isFinite(t) && now - t >= -60_000 && now - t <= minutes * 60_000
}

/** User-facing message for signInWithOtp / verifyOtp errors. */
export function otpErrorMessage(err: { message?: string; code?: string; status?: number } | null | undefined): string | null {
  if (!err) return null
  const m = (err.message || '').toLowerCase()
  const code = err.code || ''
  if (code === 'otp_expired' || m.includes('expired') || m.includes('invalid') && m.includes('token')) {
    return 'That code or link has expired or was already used. Click "Send a new code" and use the newest email right away.'
  }
  if (code === 'otp_disabled' || code === 'signup_disabled' || m.includes('signups not allowed')) {
    return 'No account found for that email. Create an account first, or check the spelling.'
  }
  if (m.includes('rate limit') || code === 'over_email_send_rate_limit' || err.status === 429) {
    return 'Too many emails sent recently. Please wait a few minutes and try again.'
  }
  if (m.includes('captcha')) return 'Please complete the security check and try again.'
  return err.message || 'Something went wrong. Please try again.'
}
