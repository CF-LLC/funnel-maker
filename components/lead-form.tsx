'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Turnstile, turnstileSiteKeySet } from '@/components/turnstile'

type Props = { slug: string; template?: string | null; fields?: string[]; ctaText?: string; thanksHref?: string }

export function LeadForm({ slug, template, fields, ctaText, thanksHref }: Props) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const [token, setToken] = useState('')
  const onToken = useCallback((t: string) => setToken(t), [])
  const show = (f: string) => !fields || fields.length === 0 || fields.includes(f)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
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

  if (state === 'done' && !thanksHref) return <p className="text-xl font-semibold mt-6">Thanks! We got your details.</p>

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3 max-w-md mx-auto text-left">
      {show('name') && <input name="name" placeholder="Name" maxLength={200} className="w-full border rounded px-3 py-2 text-black" />}
      <input name="email" type="email" required placeholder="Email" maxLength={320} className="w-full border rounded px-3 py-2 text-black" />
      {show('phone') && <input name="phone" placeholder="Phone (optional)" maxLength={50} className="w-full border rounded px-3 py-2 text-black" />}
      {show('message') && <textarea name="message" placeholder="Message (optional)" maxLength={2000} className="w-full border rounded px-3 py-2 text-black" />}
      {/* Honeypot: hidden from people, filled by bots */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <Turnstile onToken={onToken} />
      <button disabled={state === 'sending'} className="w-full bg-black text-white rounded px-4 py-3 font-semibold">
        {state === 'sending' ? 'Sending…' : ctaText || 'Submit'}
      </button>
      {state === 'error' && <p className="text-red-600 text-sm">{error}</p>}
    </form>
  )
}
