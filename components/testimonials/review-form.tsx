'use client'
import { useState } from 'react'
import { Turnstile } from '@/components/turnstile'
import { PHOTO_MAX_BYTES, PHOTO_TYPES } from '@/lib/testimonials/core'

export function ReviewForm({ handle, demo = false }: { handle: string; demo?: boolean }) {
  const [rating, setRating] = useState(0)
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [demoDone, setDemoDone] = useState(false)
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('')
    const fd = new FormData(e.currentTarget)
    const photo = fd.get('photo') as File | null
    if (photo && photo.size === 0) fd.delete('photo')
    else if (photo && photo.size > PHOTO_MAX_BYTES) return setError('Photo must be 2 MB or smaller')
    else if (photo && !(PHOTO_TYPES as readonly string[]).includes(photo.type)) return setError('Photo must be a JPG, PNG or WebP')
    if (!rating) return setError('Pick a rating from 1 to 5')
    if (demo) return setDemoDone(true)
    fd.set('handle', handle); fd.set('rating', String(rating)); fd.set('turnstileToken', token)
    setBusy(true)
    const res = await fetch('/api/testimonials/submit', { method: 'POST', body: fd })
    setBusy(false)
    if (res.ok) return setDone(true)
    const j = await res.json().catch(() => ({}))
    setError(j.error || 'Something went wrong')
  }
  if (demoDone) return <p role="status" className="rounded-xl border bg-amber-50 p-4 text-amber-900">This is a demo, nothing was sent.</p>
  if (done) return <p role="status" className="rounded-xl border bg-green-50 p-4 text-green-900">Thank you! Your review was sent. It will appear once it&apos;s approved.</p>
  const input = 'w-full rounded-lg border bg-background px-3 py-2'
  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1"><span className="text-sm font-medium">Your name</span><input name="name" required maxLength={100} autoComplete="name" className={input} /></label>
      <label className="block space-y-1"><span className="text-sm font-medium">Role or company (optional)</span><input name="role" maxLength={100} className={input} /></label>
      <fieldset className="space-y-1"><legend className="text-sm font-medium">Rating</legend>
        <div className="flex gap-1" role="radiogroup">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRating(n)}
              className={`text-3xl leading-none ${n <= rating ? 'text-amber-500' : 'text-neutral-300'}`}>★</button>
          ))}
        </div>
      </fieldset>
      <label className="block space-y-1"><span className="text-sm font-medium">Your feedback</span><textarea name="body" required minLength={10} maxLength={2000} rows={5} className={input} /></label>
      <label className="block space-y-1"><span className="text-sm font-medium">Photo (optional, JPG/PNG/WebP up to 2 MB)</span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="block text-sm" /></label>
      <p className="text-xs text-muted-foreground">Your review is private until the owner approves it.</p>
      {!demo && <Turnstile onToken={setToken} />}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="press w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white disabled:opacity-60">{busy ? 'Sending…' : 'Send review'}</button>
    </form>
  )
}
