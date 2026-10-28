'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ACCEPT, BUCKET, KINDS, MAX_FILES_PER_PRODUCT, checkFile, fmtBytes, objectPath, productUrl, redirectUrl, type DlFile, type Kind, type Product, type Store } from '@/lib/dlstore/core'
import { api, btnDanger, btnGhost, btnPrimary, card, input } from '@/components/emaillist/ui'
import { Poster } from './poster'

const L = 'block text-xs font-semibold uppercase tracking-wider text-zinc-400'
export function ProductEditor({ initial, files: initialFiles, store, demo, userId }: { initial: Product; files: DlFile[]; store: Store; demo: boolean; userId: string }) {
  const router = useRouter()
  const [p, setP] = useState(initial); const [files, setFiles] = useState(initialFiles)
  const [code, setCode] = useState<string | null>(null) // null = unchanged, '' = remove
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [up, setUp] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const set = (k: keyof Product, v: unknown) => { setP({ ...p, [k]: v }); setMsg('') }
  const thanks = store.slug ? redirectUrl(store.slug, initial.slug, p.redirect_key) : null
  const copy = (t: string, m: string) => navigator.clipboard?.writeText(t).then(() => setMsg(m))

  async function save(publish?: boolean) {
    setErr(''); setMsg('')
    if (demo) return setMsg('Demo account: changes aren’t saved.')
    setBusy(true)
    const r = await api(`/api/downloads/products/${p.id}`, 'PATCH', { ...p, published: publish ?? p.published, ...(code !== null ? { access_code: code } : {}) })
    setBusy(false)
    if (!r.ok) return setErr(r.data.error || 'Could not save.')
    setP(r.data.product); setCode(null); setMsg(publish === undefined ? 'Saved.' : publish ? 'Published. It’s live in your store.' : 'Unpublished.'); router.refresh()
  }
  async function upload(list: FileList | null) {
    setErr(''); if (!list?.length) return
    if (demo) return setErr('Demo account: uploads are turned off.')
    const sb = createClient()
    for (const f of Array.from(list)) {
      if (files.length >= MAX_FILES_PER_PRODUCT) { setErr(`Up to ${MAX_FILES_PER_PRODUCT} files per product.`); break }
      const chk = checkFile(f.name, f.size); if (!chk.ok) { setErr(`${f.name}: ${chk.error}`); continue }
      setUp(`Uploading ${f.name}…`)
      const path = objectPath(userId, p.id, chk.name, crypto.randomUUID().slice(0, 8))
      const { error } = await sb.storage.from(BUCKET).upload(path, f, { contentType: chk.mime, upsert: false })
      if (error) { setErr(`${f.name}: upload failed (${error.message}).`); continue }
      const r = await api('/api/downloads/files', 'POST', { product_id: p.id, path, name: chk.name })
      if (!r.ok) { setErr(`${f.name}: ${r.data.error || 'could not save'}`); continue }
      setFiles((x) => [...x, r.data.file])
    }
    setUp(''); if (fileRef.current) fileRef.current.value = ''
  }
  async function removeFile(id: string) {
    if (demo) return setErr('Demo account: nothing is deleted.')
    if (!confirm('Remove this file? Buyers will no longer be able to download it.')) return
    const r = await api(`/api/downloads/files?id=${id}`, 'DELETE'); if (r.ok) setFiles((x) => x.filter((f) => f.id !== id)); else setErr(r.data.error || 'Could not remove.')
  }
  async function rotate() {
    if (demo) return setMsg('Demo account: nothing is saved.')
    if (!confirm('Make a new thank-you link? The old one stops working, so update your Stripe Payment Link right after. Buyers who already got their files keep access.')) return
    const r = await api(`/api/downloads/products/${p.id}/rotate`, 'POST'); if (r.ok) { setP(r.data.product); setMsg('New thank-you link made. Paste it into your Stripe Payment Link now.') } else setErr(r.data.error || 'Could not change it.')
  }
  async function del() {
    if (demo) return setMsg('Demo account: nothing is deleted.')
    if (!confirm('Delete this product and its files? Buyer links for it will stop working.')) return
    const r = await api(`/api/downloads/products/${p.id}`, 'DELETE'); if (r.ok) router.push('/digital-downloads'); else setErr(r.data.error || 'Could not delete.')
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="min-w-0 flex-1 truncate text-2xl font-extrabold">{p.title}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${p.published ? 'bg-emerald-500 text-black' : 'bg-zinc-700 text-zinc-200'}`}>{p.published ? 'Live' : 'Draft'}</span>
        </div>
        <section className={`${card} space-y-3`}>
          <h2 className="font-bold">Details</h2>
          <label className={L}>Name<input className={`${input} mt-1`} value={p.title} maxLength={120} onChange={(e) => set('title', e.target.value)} /></label>
          <label className={L}>One-line pitch<input className={`${input} mt-1`} value={p.subtitle || ''} maxLength={200} onChange={(e) => set('subtitle', e.target.value)} placeholder="What it helps people do" /></label>
          <label className={L}>Description<textarea className={`${input} mt-1 h-32`} value={p.description || ''} maxLength={5000} onChange={(e) => set('description', e.target.value)} placeholder="What's inside, who it's for" /></label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={L}>Type<select className={`${input} mt-1`} value={p.kind} onChange={(e) => set('kind', e.target.value as Kind)}>{Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label className={L}>Price shown<input className={`${input} mt-1`} value={p.price_label || ''} maxLength={40} onChange={(e) => set('price_label', e.target.value)} placeholder="$29" /></label>
            <label className={L}>Address<input className={`${input} mt-1`} value={p.slug} maxLength={60} onChange={(e) => set('slug', e.target.value.toLowerCase())} /></label>
          </div>
          <p className="-mt-1 text-xs text-zinc-500">The price shown is just a label. The real price is whatever your Stripe Payment Link charges.</p>
        </section>
        <section className={`${card} space-y-3`}>
          <div className="flex items-center justify-between"><h2 className="font-bold">Files</h2><span className="text-xs text-zinc-500">{files.length}/{MAX_FILES_PER_PRODUCT} · up to 50 MB each</span></div>
          {files.length > 0 && <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
            {files.map((f) => <li key={f.id} className="flex items-center gap-3 px-3 py-2.5 text-sm"><span className="min-w-0 flex-1 truncate">{f.name}</span><span className="hidden shrink-0 text-xs text-zinc-500 sm:inline">{fmtBytes(f.size_bytes)} · {f.download_count} dl</span><button className="shrink-0 text-xs text-red-300 hover:underline" onClick={() => removeFile(f.id)}>Remove</button></li>)}
          </ul>}
          <label className={`${btnGhost} cursor-pointer`}>
            <input ref={fileRef} type="file" multiple accept={ACCEPT} className="sr-only" onChange={(e) => upload(e.target.files)} disabled={!!up} />{up || '+ Upload files'}
          </label>
          <p className="text-xs text-zinc-500">PDF, ZIP, EPUB, MP3, M4A, MP4, PNG, JPG, WEBP, TXT, CSV or MD. Files are private: only buyers with a valid link can download them, through links that last 60 seconds.</p>
        </section>
        <section className={`${card} space-y-3`}>
          <h2 className="font-bold">Checkout (your Stripe)</h2>
          <label className={L}>Your Stripe Payment Link<input className={`${input} mt-1`} value={p.payment_link || ''} onChange={(e) => set('payment_link', e.target.value.trim() || null)} placeholder="https://buy.stripe.com/…" inputMode="url" /></label>
          <p className="-mt-1 text-xs text-zinc-500">Make it in your own Stripe dashboard (Payment Links → New). Money goes straight to you; SaaS Nation never sees your Stripe keys.</p>
          <div className="rounded-xl bg-black/30 p-3 text-sm">
            <div className="font-semibold">Step 2: after payment, send buyers here</div>
            <p className="mt-1 text-xs text-zinc-400">In your Payment Link, open <b>After payment</b> → <b>Don’t show confirmation page</b> → paste this link:</p>
            {thanks ? <><pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-black/50 p-2 text-xs text-zinc-200">{thanks}</pre>
              <div className="mt-2 flex flex-wrap gap-2"><button type="button" className={btnGhost} onClick={() => copy(thanks, 'Thank-you link copied.')}>Copy link</button><button type="button" className={btnGhost} onClick={rotate}>Make a new link</button></div></>
              : <p className="mt-2 text-xs text-amber-200">Set your store address in Store &amp; delivery first.</p>}
          </div>
          <label className={L}>Backup access code (optional)
            <input className={`${input} mt-1 font-mono uppercase`} value={code ?? ''} onChange={(e) => setCode(e.target.value)} placeholder={p.has_code ? '•••••• (set; type to change)' : 'e.g. FOCUS-2026'} maxLength={40} autoComplete="off" /></label>
          <p className="-mt-1 text-xs text-zinc-500">Put this code in your Stripe receipt or confirmation message. Buyers who lose their link can enter it on the product page. {p.has_code && <button type="button" className="text-red-300 hover:underline" onClick={() => setCode('')}>Remove code</button>}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={L}>Downloads per order<input className={`${input} mt-1`} type="number" min={1} max={50} value={p.max_downloads} onChange={(e) => set('max_downloads', Number(e.target.value))} /></label>
            <label className={L}>Link works for (days)<input className={`${input} mt-1`} type="number" min={1} max={90} value={p.link_days} onChange={(e) => set('link_days', Number(e.target.value))} /></label>
          </div>
        </section>
        {msg && <p role="status" className="text-sm text-cyan-200">{msg}</p>}
        {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
        <div className="flex flex-wrap gap-2">
          <button className={btnPrimary} disabled={busy} onClick={() => save()}>{busy ? 'Saving…' : 'Save'}</button>
          {p.published ? <button className={btnGhost} disabled={busy} onClick={() => save(false)}>Unpublish</button> : <button className={btnGhost} disabled={busy} onClick={() => save(true)}>Save &amp; publish</button>}
          <button className={`${btnDanger} ml-auto`} onClick={del}>Delete</button>
        </div>
      </div>
      <aside className="space-y-3 lg:sticky lg:top-28 lg:self-start">
        <div className="mx-auto w-48 lg:w-full"><Poster title={p.title || 'Untitled'} kind={p.kind} accent={store.accent} priceLabel={p.price_label} /></div>
        <div className="text-center text-sm text-zinc-400">{p.download_count} downloads</div>
        {store.slug && p.published && <a href={productUrl(store.slug, initial.slug)} target="_blank" rel="noreferrer" className={`${btnGhost} w-full`}>View product page ↗</a>}
      </aside>
    </div>
  )
}
