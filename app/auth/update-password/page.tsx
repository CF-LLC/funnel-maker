'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validSession, setValidSession] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if user came from password reset email
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setValidSession(true)
      } else {
        setError('Invalid or expired reset link. Please request a new password reset.')
      }
    })
  }, [supabase.auth])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate password
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      setLoading(false)
      return
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        if (error.message.includes('same as the old password')) {
          setError('New password must be different from your current password.')
        } else if (error.message.includes('Password should be at least')) {
          setError('Password must be at least 6 characters long.')
        } else {
          setError(error.message || 'Failed to update password. Please try again.')
        }
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 2000)
    } catch (err) {
      console.error('Password update error:', err)
      setError('An unexpected error occurred. Please try again later.')
      setLoading(false)
    }
  }

  if (!validSession && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Password updated!</CardTitle>
            <CardDescription>Your password has been successfully changed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 text-green-900 border-green-200">
              <AlertDescription>
                Your password has been updated successfully. Redirecting you to the dashboard...
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Set new password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <form onSubmit={handleUpdatePassword}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="text-base"
                autoFocus
                disabled={!validSession}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="text-base"
                disabled={!validSession}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading || !validSession}>
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              <Link href="/auth/login" className="text-primary hover:underline">
                Back to Sign In
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
