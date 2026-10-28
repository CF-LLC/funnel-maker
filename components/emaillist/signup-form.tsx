'use client'
import { useCallback, useState } from 'react'
import { Turnstile } from '@/components/turnstile'

type Props = { slug: string; fromName: string; doubleOptIn: boolean; embed?: boolean; demo?: boolean }
const DONE: Record<string, string> = {
  check_email: 'Almost there! Check your inbox and tap the link to confirm.',
  subscribed: 'You’re in! Thanks for subscribing.',
  pending_no_email: 'Thanks! Your signup is saved and waiting for confirmation.',
  demo: 'This is a demo list, so nothing was saved.',
}

export function SignupForm({ slug, fromName, doubleOptIn, embed, demo }: Props) {
  const [email, setEmail] = useState(''); const [name, setName] = useState(''); const [hp, setHp] = useState('')
  const [consent, setConsent] = useState(false); const [token, setToken] = useState('')
  const [state, setState] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const onToken = useCallback((t: string) => setToken(t), [])
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true)
    const r = await fetch('/api/emaillist/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug, email, name, consent, website: hp, turnstileToken: token, embed: !!embed }) })
    const d = await r.json().catch(() => ({})); setBusy(false)
    if (!r.ok) return setErr(d.error || 'Something went wrong.')
    setState(d.state)
  }
  if (state) return <div role="status" className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5 text-center text-emerald-100"><div className="text-3xl">✉️</div><p className="mt-2 font-semibold">{DONE[state] || DONE.subscribed}</p></div>
  return (
    <form onSubmit={submit} className="space-y-3">
      <input type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-base text-white placeholder:text-zinc-400 focus:border-cyan-300 focus:outline-none" />
      <input autoComplete="given-name" placeholder="First name (optional)" value={name} onChange={(e) => setName(e.target.value)} aria-label="First name" className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-base text-white placeholder:text-zinc-400 focus:border-cyan-300 focus:outline-none" />
      <input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden="true" name="website" />
      <label className="flex gap-2 text-left text-sm text-zinc-300"><input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />Yes, send me emails from {fromName}. I can unsubscribe any time.</label>
      <Turnstile onToken={onToken} />
      {err && <p role="alert" className="text-sm text-red-300">{err}</p>}
      <button disabled={busy || !consent} className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-400 px-4 py-3 text-base font-bold text-black shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:opacity-50">{busy ? 'Joining…' : 'Subscribe'}</button>
      <p className="text-center text-xs text-zinc-500">{doubleOptIn ? 'We’ll email you a link to confirm. ' : ''}{demo ? 'Demo list.' : 'Powered by SaaS Nation.'}</p>
    </form>
  )
}
