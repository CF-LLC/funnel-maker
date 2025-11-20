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
  const [emailExists, setEmailExists] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        // Check for specific error types and provide helpful messages
        if (error.message.includes('already registered') || 
            error.message.includes('already exists') || 
            error.message.includes('User already registered')) {
          setEmailExists(true)
        } else if (error.message.includes('Password should be at least')) {
          setError('Password must be at least 6 characters long.')
        } else if (error.message.includes('invalid email')) {
          setError('Please enter a valid email address.')
        } else if (error.message.includes('network')) {
          setError('Network error. Please check your internet connection and try again.')
        } else if (error.message.includes('rate limit')) {
          setError('Too many signup attempts. Please wait a few minutes and try again.')
        } else {
          setError(error.message || 'Failed to create account. Please try again.')
        }
        setLoading(false)
        return
      }

      if (data.user) {
        // Create user record in users table
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insertError } = await (supabase
          .from('users') as any)
          .insert({ id: data.user.id, email: data.user.email! })

        if (insertError) {
          console.error('Error creating user record:', insertError)
          // Don't block the user from proceeding if this fails
        }

        // Send welcome email in the background
        fetch('/api/emails/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.user.email }),
        }).catch(console.error)

        // Redirect to dashboard
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      console.error('Registration error:', err)
      setError('An unexpected error occurred. Please try again later.')
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
