'use client'

import { useState } from 'react'

export function LeadForm({ slug, template }: { slug: string; template?: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('sending')
    const f = new FormData(e.currentTarget)
    const qs = new URLSearchParams(window.location.search)
    const utm: Record<string, string> = {}
    qs.forEach((v, k) => { if (k.startsWith('utm_') || k === 'ref') utm[k] = v })
    const res = await fetch(`/api/f/${encodeURIComponent(slug)}/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: f.get('name'), email: f.get('email'), phone: f.get('phone'),
        message: f.get('message'), website: f.get('website'), template, utm,
      }),
    })
    if (res.ok) return setState('done')
    const data = await res.json().catch(() => ({}))
    setError(data.error || 'Something went wrong')
    setState('error')
  }

  if (state === 'done') return <p className="text-xl font-semibold mt-6">Thanks! We got your details.</p>

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3 max-w-md not-prose">
      <input name="name" placeholder="Name" maxLength={200} className="w-full border rounded px-3 py-2 text-black" />
      <input name="email" type="email" required placeholder="Email" maxLength={320} className="w-full border rounded px-3 py-2 text-black" />
      <input name="phone" placeholder="Phone (optional)" maxLength={50} className="w-full border rounded px-3 py-2 text-black" />
      <textarea name="message" placeholder="Message (optional)" maxLength={2000} className="w-full border rounded px-3 py-2 text-black" />
      {/* Honeypot: hidden from people, filled by bots */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <button disabled={state === 'sending'} className="w-full bg-black text-white rounded px-4 py-2 font-semibold">
        {state === 'sending' ? 'Sending…' : 'Submit'}
      </button>
      {state === 'error' && <p className="text-red-600 text-sm">{error}</p>}
    </form>
  )
}
