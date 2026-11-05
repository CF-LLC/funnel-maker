'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Err = { field?: string; error: string; href?: string } | null

export function AddClientForm({ demo }: { demo: boolean }) {
  const router = useRouter()
  const [f, setF] = useState({ name: '', email: '', company: '', phone: '', website: '' })
  const [err, setErr] = useState<Err>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true)
    try {
      const r = await fetch('/api/crm/clients', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) })
      const j = await r.json().catch(() => ({}))
      if (r.ok && j.href) { router.push(j.href); router.refresh(); return }
      setErr({ field: j.field, error: j.error || 'Could not save. Please try again.', href: j.duplicate ? j.href : undefined })
    } catch { setErr({ error: 'Could not reach the server. Check your connection and try again.' }) }
    setBusy(false)
  }
  const field = (k: keyof typeof f, label: string, type: string, req: boolean, auto: string) => (
    <label className="block">
      <span className="text-sm font-semibold">{label}{!req && <span className="font-normal text-zinc-400"> (optional)</span>}</span>
      <input name={k} type={type} required={req} autoComplete={auto} value={f[k]} onChange={set(k)} aria-invalid={err?.field === k || undefined}
        maxLength={k === 'phone' ? 50 : k === 'website' ? 500 : 200} className={`cine-input mt-1 ${err?.field === k ? '!ring-2 !ring-rose-400' : ''}`} />
    </label>
  )
  return (
    <form onSubmit={submit} noValidate className="cine-glass mx-auto max-w-lg space-y-4 rounded-2xl p-6" data-add-client-form>
      <div>
        <h1 className="text-2xl font-black tracking-tight">Add client</h1>
        <p className="mt-1 text-sm text-zinc-400">Their email links them to your invoices, proposals, bookings and forms.</p>
      </div>
      {field('name', 'Contact person', 'text', true, 'name')}
      {field('email', 'Email', 'email', true, 'email')}
      {field('company', 'Company / business', 'text', false, 'organization')}
      {field('website', 'Website', 'url', false, 'url')}
      {field('phone', 'Phone', 'tel', false, 'tel')}
      {err && (
        <p role="alert" className="rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-rose-100 ring-1 ring-rose-400/30" data-add-client-error>
          {err.error}{err.href && <>. <Link href={err.href} className="font-semibold underline">Open that client</Link></>}
        </p>
      )}
      {demo && <p className="text-xs text-zinc-400">Demo account: nothing you add is saved.</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="press rounded-full bg-white px-5 py-2 text-sm font-semibold text-black disabled:opacity-60">{busy ? 'Saving…' : 'Save client'}</button>
        <Link href="/crm" className="text-sm text-zinc-400 hover:underline">Cancel</Link>
      </div>
    </form>
  )
}
