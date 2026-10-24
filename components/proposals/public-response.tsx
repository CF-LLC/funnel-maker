'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Turnstile } from '@/components/turnstile'

export function ProposalResponse({ handle, id }: { handle: string; id: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function respond(action: 'accept' | 'decline') {
    setError('')
    if (action === 'accept' && name.trim().length < 2) return setError('Type your full name to accept')
    if (action === 'decline' && !confirm('Decline this proposal?')) return
    setBusy(true)
    const res = await fetch('/api/proposals/respond', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handle, id, action, name: name.trim(), turnstileToken: token }) })
    setBusy(false)
    if (res.ok) return router.refresh()
    const j = await res.json().catch(() => ({}))
    setError(j.error || 'Something went wrong')
  }
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <label className="block space-y-1"><span className="text-sm font-medium">Your full name</span>
        <input className="w-full rounded-lg border bg-background px-3 py-2" maxLength={200} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
      <p className="text-xs text-muted-foreground">Typing your name and clicking Accept records your acceptance and today&apos;s date.</p>
      <Turnstile onToken={setToken} />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button type="button" disabled={busy} onClick={() => respond('accept')} className="press flex-1 rounded-xl bg-brand px-4 py-3 font-semibold text-white disabled:opacity-60">Accept</button>
        <button type="button" disabled={busy} onClick={() => respond('decline')} className="flex-1 rounded-xl border px-4 py-3 font-semibold disabled:opacity-60">Decline</button>
      </div>
    </div>
  )
}
