'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/update-password`,
      })

      if (error) {
        if (error.message.includes('rate limit')) {
          setError('Too many reset attempts. Please wait a few minutes and try again.')
        } else if (error.message.includes('network')) {
          setError('Network error. Please check your internet connection and try again.')
        } else {
          setError(error.message || 'Failed to send reset email. Please try again.')
        }
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
    } catch (err) {
      console.error('Password reset error:', err)
      setError('An unexpected error occurred. Please try again later.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription>Password reset instructions sent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 text-green-900 border-green-200">
              <AlertDescription>
                We've sent password reset instructions to <strong>{email}</strong>. 
                Check your inbox and click the link to reset your password.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              Didn't receive the email? Check your spam folder or try again in a few minutes.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Link href="/auth/login" className="w-full">
              <Button variant="outline" className="w-full">
                Back to Sign In
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Reset your password</CardTitle>
          <CardDescription>Enter your email to receive reset instructions</CardDescription>
        </CardHeader>
        <form onSubmit={handleResetPassword}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
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
                autoFocus
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Instructions'}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Remember your password?{' '}
              <Link href="/auth/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
