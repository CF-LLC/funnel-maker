'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { authCallbackUrl } from '@/lib/auth-urls'
import { googleLoginEnabled } from '@/lib/auth-methods'
import { trackEvent } from '@/lib/site-events/client'
import { Button } from '@/components/ui/button'

/** "Continue with Google". Renders nothing unless NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED=true. Lands on /auth/callback (runs ensure-profile). */
export function GoogleButton({ mode, onError }: { mode: 'login' | 'signup'; onError?: (msg: string) => void }) {
  const [busy, setBusy] = useState(false)
  if (!googleLoginEnabled) return null
  const go = async () => {
    setBusy(true)
    if (mode === 'signup') trackEvent('signup_started', { method: 'google' })
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authCallbackUrl({ m: 'oauth' }) },
    })
    if (error) { setBusy(false); onError?.(error.message || 'Google sign-in is not available right now.') }
  }
  return (
    <Button type="button" variant="outline" className="w-full" onClick={go} disabled={busy} data-testid="google-login">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="mr-2 h-4 w-4"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.7-2.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>
      {busy ? 'Opening Google...' : 'Continue with Google'}
    </Button>
  )
}
