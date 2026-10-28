'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { KINDS, MAX_PRODUCTS, storeUrl, type Kind, type Product, type Store } from '@/lib/dlstore/core'
import { Modal, Stat, api, btnGhost, btnPrimary, input } from '@/components/emaillist/ui'
import { Poster } from './poster'

export function ProductsView({ initial, store, orders, demo }: { initial: Product[]; store: Store; orders: number; demo: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false); const [title, setTitle] = useState(''); const [kind, setKind] = useState<Kind>('pdf')
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const downloads = initial.reduce((n, p) => n + p.download_count, 0)
  const live = initial.filter((p) => p.published).length
  async function create(e: React.FormEvent) {
    e.preventDefault(); setErr('')
    if (demo) return setErr('Demo account: nothing is saved.')
    setBusy(true); const r = await api('/api/downloads/products', 'POST', { title, kind }); setBusy(false)
    if (!r.ok) return setErr(r.data.error || 'Could not create.')
    router.push(`/digital-downloads/products/${r.data.product.id}`)
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold sm:text-3xl">Your products</h1>
          {store.slug ? <a href={storeUrl(store.slug)} target="_blank" rel="noreferrer" className="mt-1 block truncate text-sm text-cyan-300 hover:underline">{storeUrl(store.slug).replace(/^https?:\/\//, '')} ↗</a>
            : <Link href="/digital-downloads/settings" className="mt-1 block text-sm text-amber-200 hover:underline">Set your store address to go live →</Link>}
        </div>
        <button className={btnPrimary} onClick={() => setOpen(true)} disabled={initial.length >= MAX_PRODUCTS}>+ New product</button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Live" value={`${live}/${initial.length}`} />
        <Stat label="Orders" value={orders} />
        <Stat label="Downloads" value={downloads} />
      </div>
      {initial.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
          <h2 className="text-lg font-bold">Sell your first download</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">Upload a PDF, course files or templates, paste your own Stripe Payment Link, and share your store. Buyers get a private download link right after paying.</p>
          <button className={`${btnPrimary} mt-4`} onClick={() => setOpen(true)}>+ New product</button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {initial.map((p, i) => (
            <li key={p.id}>
              <Link href={`/digital-downloads/products/${p.id}`} className="group block">
                <div className="relative transition duration-300 group-hover:-translate-y-1 group-hover:scale-[1.02]">
                  <Poster title={p.title} kind={p.kind} accent={store.accent} priceLabel={p.price_label} index={i} />
                  <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${p.published ? 'bg-emerald-500 text-black' : 'bg-zinc-700 text-zinc-200'}`}>{p.published ? 'Live' : 'Draft'}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-zinc-400"><span>{KINDS[p.kind]}</span><span>{p.download_count} downloads</span></div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="New product">
        <form onSubmit={create} className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Name<input className={`${input} mt-1`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required placeholder="e.g. First Ten Clients" autoFocus /></label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Type
            <select className={`${input} mt-1`} value={kind} onChange={(e) => setKind(e.target.value as Kind)}>{Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
          <div className="flex justify-end gap-2"><button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancel</button><button className={btnPrimary} disabled={busy}>{busy ? 'Creating…' : 'Create'}</button></div>
        </form>
      </Modal>
    </div>
  )
}
