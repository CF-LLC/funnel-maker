'use client'
import { useEffect, useRef, useState } from 'react'

/** Runs one POST on mount (link scanners only GET the page, so they never confirm or unsubscribe anyone). */
export function TokenAction({ kind, token, b }: { kind: 'confirm' | 'unsubscribe'; token: string; b?: string }) {
  const [st, setSt] = useState<'busy' | 'ok' | 'bad'>('busy'); const [who, setWho] = useState('')
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    fetch(`/api/emaillist/${kind}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, b }) })
      .then((r) => r.json()).then((d) => { setWho(d.fromName || ''); setSt(d.ok ? 'ok' : 'bad') }).catch(() => setSt('bad'))
  }, [kind, token, b])
  const text = {
    confirm: { busy: 'Confirming…', ok: `You’re confirmed${who ? ` for ${who}’s emails` : ''}. Welcome!`, bad: 'This link has expired or was already used. If you already confirmed, you’re all set.' },
    unsubscribe: { busy: 'Unsubscribing…', ok: `You’re unsubscribed${who ? ` from ${who}’s emails` : ''}. You won’t get any more.`, bad: 'We couldn’t find that subscription. It may already be removed.' },
  }[kind][st]
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07070a] px-4 text-white">
      <main className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl">
        <div className="text-4xl">{st === 'busy' ? '⏳' : st === 'ok' ? (kind === 'confirm' ? '🎉' : '👋') : '🤔'}</div>
        <h1 className="mt-3 text-xl font-bold" role="status">{text}</h1>
        {kind === 'unsubscribe' && st === 'ok' && <p className="mt-3 text-sm text-zinc-400">Changed your mind? You can sign up again any time from their signup page.</p>}
      </main>
    </div>
  )
}
