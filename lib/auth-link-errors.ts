/** Map Supabase email-link error params to a user-facing message (null when no error). */
export function confirmLinkErrorMessage(code: string | null, description: string | null): string | null {
  if (!code && !description) return null
  const d = (description ?? '').toLowerCase()
  if (code === 'otp_expired' || d.includes('expired') || d.includes('invalid')) {
    return 'That confirmation link has expired or was already used. Enter your email below and click "Resend confirmation email" to get a new one.'
  }
  return 'We could not confirm your email from that link. Enter your email below and resend the confirmation email.'
}
