'use client'

import { useState } from 'react'
import { Turnstile } from '@/components/turnstile'
import type { Field } from '@/lib/forms/core'

export function PublicFormView({ handle, slug, fields, submitLabel, demo = false }: { handle: string; slug: string; fields: Field[]; submitLabel: string; demo?: boolean }) {
  const [data, setData] = useState<Record<string, string | boolean>>({})
  const [token, setToken] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'demo'>('idle')
  const [error, setError] = useState('')
  const set = (id: string, v: string | boolean) => setData((d) => ({ ...d, [id]: v }))

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('')
    if (demo) return setState('demo')
    setState('sending')
    const website = (e.currentTarget.elements.namedItem('website') as HTMLInputElement | null)?.value
    const res = await fetch('/api/forms/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handle, slug, data, turnstileToken: token, website }) })
    if (res.ok) return setState('done')
    const j = await res.json().catch(() => ({}))
    setError(j.error || 'Something went wrong'); setState('idle')
  }

  if (state === 'demo') return <p role="status" className="rounded-xl border bg-amber-50 p-4 text-amber-900">This is a demo, nothing was sent.</p>
  if (state === 'done') return <p role="status" className="rounded-xl border bg-green-50 p-4 text-green-900">Thanks! Your response was sent.</p>
  const input = 'w-full rounded-lg border bg-background px-3 py-2'
  return (
    <form onSubmit={submit} className="space-y-4 text-left">
      {fields.map((f) => (
        <div key={f.id}>
          {f.type === 'checkbox' ? (
            <label className="flex items-center gap-2"><input type="checkbox" required={f.required} checked={!!data[f.id]} onChange={(e) => set(f.id, e.target.checked)} />{f.label}{f.required && ' *'}</label>
          ) : (
            <label className="block space-y-1"><span className="text-sm font-medium">{f.label}{f.required && ' *'}</span>
              {f.type === 'long_text' ? <textarea className={input} rows={4} maxLength={5000} required={f.required} value={String(data[f.id] ?? '')} onChange={(e) => set(f.id, e.target.value)} />
                : f.type === 'dropdown' ? (
                  <select className={input} required={f.required} value={String(data[f.id] ?? '')} onChange={(e) => set(f.id, e.target.value)}>
                    <option value="">Choose…</option>{(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>)
                : <input className={input} maxLength={300} required={f.required} value={String(data[f.id] ?? '')} onChange={(e) => set(f.id, e.target.value)}
                    type={f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : f.type === 'date' ? 'date' : 'text'} />}
            </label>
          )}
        </div>
      ))}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {!demo && <Turnstile onToken={setToken} />}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={state === 'sending'} className="press w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white disabled:opacity-60">{state === 'sending' ? 'Sending…' : submitLabel}</button>
    </form>
  )
}
