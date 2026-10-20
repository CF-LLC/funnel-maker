'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Turnstile, turnstileSiteKeySet } from '@/components/turnstile'

type Props = { slug: string; template?: string | null; fields?: string[]; ctaText?: string; thanksHref?: string; preview?: boolean }

export function LeadForm({ slug, template, fields, ctaText, thanksHref, preview = false }: Props) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const [token, setToken] = useState('')
  const onToken = useCallback((t: string) => setToken(t), [])
  const show = (f: string) => !fields || fields.length === 0 || fields.includes(f)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (preview) { setError('Preview only: the form works once your funnel is published.'); setState('error'); return }
    if (turnstileSiteKeySet && !token) { setError('Please complete the bot check'); setState('error'); return }
    setState('sending')
    const f = new FormData(e.currentTarget)
    const qs = new URLSearchParams(window.location.search)
    const utm: Record<string, string> = {}
    qs.forEach((v, k) => { if (k.startsWith('utm_') || k === 'ref') utm[k] = v })
    const res = await fetch(`/api/f/${encodeURIComponent(slug)}/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: f.get('name') ?? '', email: f.get('email'), phone: f.get('phone') ?? '',
        message: f.get('message') ?? '', website: f.get('website'), template: template || '', utm, turnstileToken: token,
      }),
    })
    if (res.ok) {
      setState('done')
      if (thanksHref) router.push(thanksHref)
      return
    }
    const data = await res.json().catch(() => ({}))
    setError(data.error || 'Something went wrong')
    setState('error')
  }

  if (state === 'done' && !thanksHref) return <p role="status" className="text-xl font-semibold mt-6">Thanks! We got your details.</p>

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3 max-w-md mx-auto text-left">
      {show('name') && <input name="name" placeholder="Name" maxLength={200} className="fm-input" />}
      <input name="email" type="email" required placeholder="Email" maxLength={320} className="fm-input" />
      {show('phone') && <input name="phone" placeholder="Phone (optional)" maxLength={50} className="fm-input" />}
      {show('message') && <textarea name="message" placeholder="Message (optional)" maxLength={2000} className="fm-input" />}
      {/* Honeypot: hidden from people, filled by bots */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {!preview && <Turnstile onToken={onToken} />}
      <button disabled={state === 'sending'} className="fm-cta w-full">
        {state === 'sending' ? 'Sending…' : ctaText || 'Submit'}
      </button>
      {state === 'error' && <p role="alert" className="fm-form-error text-sm">{error}</p>}
    </form>
  )
}
