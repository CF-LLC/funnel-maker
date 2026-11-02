'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Turnstile } from '@/components/turnstile'
import { trackEvent } from '@/lib/site-events/client'
import { CAPTURE_CONSENT_TEXT } from '@/lib/capture/core'
import { upgradeFor } from '@/lib/free-tools/upgrade'

/** Wraps a free tool: counts the first real use (once per page load), then shows the Save/Upgrade card and the optional email box. */
export function FreeToolExtras({ slug, children }: { slug: string; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const [used, setUsed] = useState(false)
  useEffect(() => {
    const el = box.current
    if (!el || used) return
    const mark = (e: Event) => {
      const t = e.target as HTMLElement | null
      if (e.type === 'click' && !t?.closest?.('button, a')) return
      setUsed(true); trackEvent('free_tool_used', { tool: slug })
    }
    el.addEventListener('click', mark, true); el.addEventListener('input', mark, true)
    return () => { el.removeEventListener('click', mark, true); el.removeEventListener('input', mark, true) }
  }, [slug, used])
  return (
    <>
      <div ref={box}>{children}</div>
      <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
        <UpgradeCard slug={slug} highlight={used} />
        <EmailCapture slug={slug} />
      </div>
    </>
  )
}

export function UpgradeCard({ slug, highlight }: { slug: string; highlight?: boolean }) {
  const u = upgradeFor(slug)
  return (
    <section aria-labelledby="save-h" data-testid="upgrade-card" className={`rounded-2xl border p-5 ${highlight ? 'border-emerald-400/40 bg-emerald-400/[0.06]' : 'border-white/10 bg-white/[0.03]'}`}>
      <h2 id="save-h" className="text-lg font-bold text-white">{u.heading}</h2>
      <p className="mt-2 text-sm text-zinc-300">{u.body}</p>
      <p className="mt-2 text-sm text-zinc-400">{u.priceNote}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/auth/register" onClick={() => trackEvent('upgrade_clicked', { tool: slug, plan: 'signup' })} className="inline-flex min-h-[44px] items-center rounded-md bg-white px-4 font-bold text-black hover:bg-zinc-200">Create an account</Link>
        <Link href="/pricing" onClick={() => trackEvent('upgrade_clicked', { tool: slug, plan: 'pricing' })} className="inline-flex min-h-[44px] items-center rounded-md border border-white/20 px-4 font-semibold text-white hover:bg-white/10">See pricing</Link>
      </div>
    </section>
  )
}

export function EmailCapture({ slug }: { slug: string }) {
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [company, setCompany] = useState('') // honeypot
  const [armed, setArmed] = useState(false)
  const [token, setToken] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [err, setErr] = useState('')
  const onToken = useCallback((t: string) => setToken(t), [])
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr('')
    if (!consent) { setErr('Please tick the box to agree.'); return }
    setState('busy')
    try {
      const r = await fetch('/api/free-tools/email', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, tool: slug, consent, company, turnstileToken: token }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErr(j.error || 'Something went wrong. Please try again.'); setState('idle'); return }
      setState('done')
    } catch { setErr('Network error. Please try again.'); setState('idle') }
  }
  return (
    <section aria-labelledby="tips-h" data-testid="email-capture" className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 id="tips-h" className="text-lg font-bold text-white">Get tips for this tool <span className="text-sm font-normal text-zinc-400">(optional)</span></h2>
      {state === 'done' ? (
        <p role="status" className="mt-3 font-semibold text-emerald-300">✓ Saved. You can unsubscribe any time.</p>
      ) : (
        <form onSubmit={submit} className="mt-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor={`tips-email-${slug}`} className="sr-only">Email address</label>
            <input id={`tips-email-${slug}`} type="email" required autoComplete="email" inputMode="email" maxLength={320} value={email} onFocus={() => setArmed(true)} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
              className="min-h-[44px] min-w-0 flex-1 rounded-md border border-white/15 bg-zinc-900 px-3 text-white placeholder:text-zinc-500 focus:border-white focus:outline-none" />
            <button type="submit" disabled={state === 'busy'} className="min-h-[44px] rounded-md bg-white px-4 font-bold text-black hover:bg-zinc-200 disabled:opacity-60">{state === 'busy' ? 'Saving…' : 'Save my email'}</button>
          </div>
          <label className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-zinc-400">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
            <span>{CAPTURE_CONSENT_TEXT} See our <a href="/privacy" className="underline">Privacy Policy</a>.</span>
          </label>
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Company<input tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} name="company" /></label></div>
          {armed && <Turnstile onToken={onToken} />}
          {err && <p role="alert" className="mt-2 text-sm text-red-400">{err}</p>}
        </form>
      )}
    </section>
  )
}
