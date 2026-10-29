'use client'

import { useCallback, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Turnstile } from '@/components/turnstile'
import { UPDATES_CONSENT_TEXT } from '@/lib/updates/signup'

/** "Get new tools as they ship". Stores the signup via /api/updates/subscribe. No email is sent. */
export function UpdatesSignup() {
  const path = usePathname() || '/'
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('') // honeypot
  const [armed, setArmed] = useState(false) // load the Turnstile script only after the user engages
  const [token, setToken] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [err, setErr] = useState('')
  const onToken = useCallback((t: string) => setToken(t), [])

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setState('busy')
    try {
      const r = await fetch('/api/updates/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, company, source: path, turnstileToken: token }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErr(j.error || 'Something went wrong. Please try again.'); setState('idle'); return }
      setState('done')
    } catch { setErr('Network error. Please try again.'); setState('idle') }
  }

  return (
    <section aria-labelledby="updates-h" className="px-4 py-10 sm:px-8">
      <div className="max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 id="updates-h" className="text-lg font-bold text-white">Get new tools as they ship</h2>
        {state === 'done' ? (
          <p role="status" className="mt-3 font-semibold text-emerald-300">✓ You&apos;re on the list. We&apos;ll email you when a new tool launches.</p>
        ) : (
          <form onSubmit={submit} className="mt-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="updates-email" className="sr-only">Email address</label>
              <input id="updates-email" type="email" required autoComplete="email" inputMode="email" maxLength={320} value={email} onFocus={() => setArmed(true)} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                className="min-h-[48px] min-w-0 flex-1 rounded-md border border-white/15 bg-zinc-900 px-3 text-white placeholder:text-zinc-500 focus:border-white focus:outline-none" />
              <button type="submit" disabled={state === 'busy'} className="min-h-[48px] rounded-md bg-white px-5 font-bold text-black hover:bg-zinc-200 disabled:opacity-60">{state === 'busy' ? 'Adding…' : 'Notify me'}</button>
            </div>
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Company<input tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} name="company" /></label></div>
            {armed && <Turnstile onToken={onToken} />}
            {err && <p role="alert" className="mt-2 text-sm text-red-400">{err}</p>}
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">{UPDATES_CONSENT_TEXT} By signing up you agree to get these emails. See our <a href="/privacy" className="underline">Privacy Policy</a>.</p>
          </form>
        )}
      </div>
    </section>
  )
}
