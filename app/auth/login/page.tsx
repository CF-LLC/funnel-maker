'use client'

import { useState, useEffect, useCallback } from 'react'
import { authCallbackUrl } from '@/lib/auth-urls'
import { Turnstile, turnstileSiteKeySet } from '@/components/turnstile'
import { confirmLinkErrorMessage } from '@/lib/auth-link-errors'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { safeReturnPath } from '@/lib/safe-redirect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState('')
  const [needsConfirm, setNeedsConfirm] = useState(false)
  const [resending, setResending] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const onToken = useCallback((t: string) => setCaptchaToken(t), [])
  const router = useRouter()
  const supabase = createClient()

  // Surface confirmation-link failures (e.g. expired link) passed via query or hash.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const msg = confirmLinkErrorMessage(q.get('error_code') ?? h.get('error_code'), q.get('error_description') ?? h.get('error_description'))
    if (msg) {
      setError(msg)
      setNeedsConfirm(true)
    }
  }, [])

  const handleResend = async () => {
    setError('')
    setInfo('')
    if (!email) {
      setError('Enter your email above, then click resend.')
      return
    }
    setResending(true)
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: authCallbackUrl(),
        ...(turnstileSiteKeySet ? { captchaToken } : {}),
      },
    })
    setResending(false)
    if (resendError) {
      setError(resendError.message.toLowerCase().includes('rate limit')
        ? 'Too many emails sent recently. Please wait a few minutes and try again.'
        : resendError.message || 'Could not resend the confirmation email.')
      return
    }
    setInfo('Confirmation email sent. Open the newest email and click the link right away.')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Provide user-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.')
        } else if (error.message.includes('Email not confirmed')) {
          setError('Your email is not confirmed yet. Click the link in your confirmation email, or resend it below if the link expired.')
          setNeedsConfirm(true)
        } else if (error.message.includes('Too many requests')) {
          setError('Too many login attempts. Please wait a few minutes and try again.')
        } else if (error.message.includes('network')) {
          setError('Network error. Please check your internet connection and try again.')
        } else {
          setError(error.message || 'Failed to sign in. Please try again.')
        }
        setLoading(false)
        return
      }

      if (data.user) {
        // Ensure the profile row exists (server-side, service role, idempotent). Never blocks login.
        await fetch('/api/auth/ensure-profile', { method: 'POST' }).catch((e) => console.error('ensure-profile', e))

        // Small delay to ensure everything is saved
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Redirect to dashboard
        const params = new URLSearchParams(window.location.search)
        window.location.href = safeReturnPath(params.get('redirectTo') ?? params.get('next'))
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred. Please try again later.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-app p-4">
      <Card className="w-full max-w-md overflow-hidden shadow-xl shadow-violet-500/10">
        <div className="h-1.5 bg-brand" />
        <CardHeader>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your SaaS Nation account</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {info && (
              <Alert>
                <AlertDescription>{info}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link 
                  href="/auth/reset-password" 
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="text-base"
              />
            </div>
            {needsConfirm && (
              <div className="space-y-2">
                <Turnstile onToken={onToken} />
                <Button type="button" variant="outline" className="w-full" onClick={handleResend} disabled={resending || (turnstileSiteKeySet && !captchaToken)}>
                  {resending ? 'Sending...' : 'Resend confirmation email'}
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/auth/register" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
