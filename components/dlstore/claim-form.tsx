'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

/** Buyer claim: redirect key (thanks page) or access code. Optional email = a copy of the private link (only if delivery email is on). */
export function ClaimForm({ store, product, mode, k, accent, demo, emailOn }: { store: string; product: string; mode: 'key' | 'code'; k?: string; accent: string; demo?: boolean; emailOn?: boolean }) {
  const router = useRouter()
  const [code, setCode] = useState(''); const [email, setEmail] = useState(''); const [hp, setHp] = useState('')
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  async function go(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true)
    const r = await fetch('/api/downloads/claim', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ store, product, key: mode === 'key' ? k : undefined, code: mode === 'code' ? code : undefined, email: email || undefined, website: hp || undefined }) })
    const d = await r.json().catch(() => ({})); setBusy(false)
    if (!r.ok || !d.token) return setErr(d.error || 'Something went wrong. Please try again.')
    router.push(`/d/${d.token}${d.emailed ? '?sent=1' : ''}`)
  }
  const inp = 'w-full rounded-lg border border-white/15 bg-black/40 px-3 py-3 text-base text-white placeholder:text-zinc-500 focus:border-white/50 focus:outline-none'
  return (
    <form onSubmit={go} className="space-y-3">
      {mode === 'code' && <input className={`${inp} font-mono uppercase tracking-widest`} aria-label="Access code" placeholder="ACCESS-CODE" value={code} onChange={(e) => setCode(e.target.value)} required minLength={4} maxLength={40} autoComplete="off" />}
      {emailOn && <label className="block text-sm text-zinc-300">Email me a copy of my private link (optional)<input className={`${inp} mt-1`} type="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></label>}
      <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={hp} onChange={(e) => setHp(e.target.value)} name="website" />
      {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
      <button disabled={busy} className="w-full rounded-md px-6 py-3.5 text-base font-bold transition hover:brightness-110 disabled:opacity-60" style={{ background: accent, color: accent === '#ffffff' ? '#000' : '#fff' }}>{busy ? 'Unlocking…' : mode === 'code' ? 'Unlock my files' : 'Get my files'}</button>
      {demo && <p className="text-center text-xs text-cyan-200">Demo: this opens a sample download page. Nothing is real.</p>}
    </form>
  )
}
