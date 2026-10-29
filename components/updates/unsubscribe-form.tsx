'use client'
import { useState } from 'react'

export function UnsubscribeForm({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  async function go() {
    setState('busy')
    const r = await fetch('/api/updates/unsubscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) }).catch(() => null)
    if (r?.ok) return setState('done')
    setMsg((await r?.json().catch(() => null))?.error || 'Something went wrong. Please try again.')
    setState('error')
  }
  if (state === 'done') return <p role="status" data-unsub-done className="rounded-2xl bg-emerald-500/10 p-4 text-emerald-200 ring-1 ring-emerald-400/30">✓ You&apos;re unsubscribed. You won&apos;t get new-tool emails from SaaS Nation.</p>
  return (
    <div className="space-y-3">
      <button onClick={go} disabled={state === 'busy'} className="press min-h-[44px] w-full rounded-xl bg-white px-5 font-semibold text-black hover:brightness-95 disabled:opacity-60 sm:w-auto">{state === 'busy' ? 'Unsubscribing…' : 'Unsubscribe me'}</button>
      {state === 'error' && <p role="alert" className="text-sm text-rose-300">{msg}</p>}
    </div>
  )
}
