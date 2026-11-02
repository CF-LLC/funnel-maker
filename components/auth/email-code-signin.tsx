'use client'

import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { authCallbackUrl } from '@/lib/auth-urls'
import { isNewUser, normalizeOtpCode, otpErrorMessage } from '@/lib/auth-methods'
import { safeReturnPath } from '@/lib/safe-redirect'
import { trackEvent } from '@/lib/site-events/client'
import { Turnstile, turnstileSiteKeySet } from '@/components/turnstile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

/**
 * Passwordless sign-in: emails a sign-in link AND a one-time code (signInWithOtp).
 * The code box (verifyOtp type 'email') works even when the link can't be opened in this browser.
 * login: shouldCreateUser false. signup: shouldCreateUser true (+ signup metadata).
 */
export function EmailCodeSignIn({ mode, initialEmail = '', metadata }: { mode: 'login' | 'signup'; initialEmail?: string; metadata?: Record<string, string> }) {
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaKey, setCaptchaKey] = useState(0)
  const onToken = useCallback((t: string) => setCaptchaToken(t), [])
  const supabase = createClient()

  const send = async () => {
    setError(''); setInfo('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address.'); return }
    setBusy(true)
    if (mode === 'signup') trackEvent('signup_started', { method: 'email_code' })
    const { error: e } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: mode === 'signup',
        emailRedirectTo: authCallbackUrl(mode === 'signup' ? { m: 'otp_signup' } : { m: 'otp' }),
        ...(mode === 'signup' && metadata ? { data: metadata } : {}),
        ...(turnstileSiteKeySet ? { captchaToken } : {}),
      },
    })
    setBusy(false)
    // Turnstile tokens are single-use: remount the widget for the next send.
    setCaptchaToken(''); setCaptchaKey((k) => k + 1)
    if (e) { setError(otpErrorMessage(e) || 'Could not send the email.'); return }
    setSent(true)
    setInfo('Check your email. Click the sign-in link, or type the code from the email below.')
  }

  const verify = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setError(''); setInfo('')
    const token = normalizeOtpCode(code)
    if (!token) { setError('Enter the code from the email (numbers only).'); return }
    setBusy(true)
    const { data, error: e } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    if (e || !data?.user) { setBusy(false); setError(otpErrorMessage(e) || 'That code did not work.'); return }
    if (mode === 'signup' && isNewUser(data.user)) trackEvent('signup_completed', { method: 'email_code' })
    await fetch('/api/auth/ensure-profile', { method: 'POST' }).catch(() => null)
    const params = new URLSearchParams(window.location.search)
    window.location.href = safeReturnPath(params.get('redirectTo') ?? params.get('next'))
  }

  const sendDisabled = busy || (turnstileSiteKeySet && !captchaToken)
  return (
    <div className="space-y-3" data-testid="email-code-signin">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {info && <Alert><AlertDescription>{info}</AlertDescription></Alert>}
      <div className="space-y-2">
        <Label htmlFor={`otp-email-${mode}`}>Email</Label>
        <Input id={`otp-email-${mode}`} type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="text-base" />
      </div>
      <Turnstile key={captchaKey} onToken={onToken} />
      <Button type="button" variant="outline" className="w-full" onClick={send} disabled={sendDisabled}>
        {busy && !sent ? 'Sending...' : sent ? 'Send a new code' : mode === 'signup' ? 'Email me a sign-up code' : 'Email me a sign-in link'}
      </Button>
      {sent && (
        <form onSubmit={verify} className="space-y-2">
          <Label htmlFor={`otp-code-${mode}`}>Code from the email</Label>
          <Input id={`otp-code-${mode}`} inputMode="numeric" autoComplete="one-time-code" placeholder="Code from the email" maxLength={12} value={code} onChange={(e) => setCode(e.target.value)} className="text-base tracking-widest" />
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Checking...' : 'Sign in with code'}</Button>
          <p className="text-xs text-muted-foreground">Code expired? Click &quot;Send a new code&quot; and use the newest email.</p>
        </form>
      )}
    </div>
  )
}
