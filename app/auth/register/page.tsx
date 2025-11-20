'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [emailExists, setEmailExists] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setEmailExists(false)
    setLoading(true)

    // Validate password strength
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      setLoading(false)
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.')
      setLoading(false)
      return
    }

    try {
      setSuccess('Creating your account...')
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`,
          data: {
            email_confirm: true, // Auto-confirm for development
          }
        },
      })

      if (error) {
        // Check for specific error types and provide helpful messages
        if (error.message.includes('already registered') || 
            error.message.includes('already exists') || 
            error.message.includes('User already registered')) {
          setEmailExists(true)
          setSuccess('')
        } else if (error.message.includes('Password should be at least')) {
          setError('Password must be at least 6 characters long.')
          setSuccess('')
        } else if (error.message.includes('invalid email')) {
          setError('Please enter a valid email address.')
          setSuccess('')
        } else if (error.message.includes('network')) {
          setError('Network error. Please check your internet connection and try again.')
          setSuccess('')
        } else if (error.message.includes('rate limit')) {
          setError('Too many signup attempts. Please wait a few minutes and try again.')
          setSuccess('')
        } else {
          setError(error.message || 'Failed to create account. Please try again.')
          setSuccess('')
        }
        setLoading(false)
        return
      }

      if (data.user) {
        setSuccess('Account created! Setting up your profile...')
        
        try {
          // Wait a bit for Supabase trigger to complete
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Verify user record exists, create if not
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: upsertError } = await (supabase
            .from('users') as any)
            .upsert(
              { id: data.user.id, email: data.user.email! },
              { onConflict: 'id' }
            )

          if (upsertError) {
            console.error('Error creating user record:', upsertError)
            setError('Account created but there was an issue setting up your profile. Please try logging in.')
            setSuccess('')
            setLoading(false)
            return
          }

          // Verify subscription exists, create if not
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: subError } = await (supabase
            .from('subscriptions') as any)
            .upsert(
              {
                user_id: data.user.id,
                plan_type: 'free',
                status: 'active'
              },
              { onConflict: 'user_id' }
            )

          if (subError) {
            console.error('Error creating subscription:', subError)
          }

          // Send welcome email in the background
          fetch('/api/emails/welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: data.user.email }),
          }).catch(console.error)

          setSuccess('Success! Redirecting to your dashboard...')
          
          // Give user time to see the success message
          await new Promise(resolve => setTimeout(resolve, 1000))

          // Redirect to dashboard
          window.location.href = '/dashboard'
        } catch (setupError) {
          console.error('User setup error:', setupError)
          setError('Account created but there was an issue setting up. Please try logging in.')
          setSuccess('')
          setLoading(false)
        }
      }
    } catch (err) {
      console.error('Registration error:', err)
      setError('An unexpected error occurred. Please try again later.')
      setSuccess('')
      setLoading(false)
    }
  }

return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>Start building funnels in minutes</CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            {emailExists && (
              <Alert variant="destructive">
                <AlertDescription>
                  This email is already registered.{' '}
                  <Link href="/auth/login" className="text-primary hover:underline font-semibold">
                    Sign in instead
                  </Link>
                </AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="bg-green-50 text-green-900 border-green-200">
                <AlertDescription>{success}</AlertDescription>
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
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
