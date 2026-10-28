'use client'
import { useMemo, useState } from 'react'
import { ACCENTS, SITE, downloadPageUrl, renderDelivery, storeUrl, type Store } from '@/lib/dlstore/core'
import { api, btnPrimary, card, input } from '@/components/emaillist/ui'

const L = 'block text-xs font-semibold uppercase tracking-wider text-zinc-400'
export function StoreSettings({ initial, demo, platformSending }: { initial: Store; demo: boolean; platformSending: boolean }) {
  const [s, setS] = useState(initial); const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const set = (k: keyof Store, v: unknown) => { setS({ ...s, [k]: v }); setMsg('') }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr('')
    if (demo) return setMsg('Demo account: settings aren’t saved.')
    setBusy(true); const r = await api('/api/downloads/store', 'PUT', s); setBusy(false)
    if (!r.ok) return setErr(r.data.error || 'Could not save.')
    setS(r.data.store); setMsg('Saved.')
  }
  const preview = useMemo(() => renderDelivery({ storeName: s.title || 'Your store', productTitle: 'First Ten Clients', accent: s.accent, url: downloadPageUrl('demo'),
    files: [{ name: 'First-Ten-Clients.pdf', size_bytes: 4_812_331 }, { name: 'Outreach-Scripts.pdf', size_bytes: 612_002 }], maxDownloads: 5, expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(), supportEmail: s.support_email }).html, [s.title, s.accent, s.support_email])
  return (
    <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0 space-y-5">
        <h1 className="text-2xl font-extrabold">Store &amp; delivery</h1>
        <section className={`${card} space-y-3`}>
          <h2 className="font-bold">Storefront</h2>
          <label className={L}>Store address<div className="mt-1 flex items-center gap-1"><span className="shrink-0 text-sm text-zinc-500">{SITE.replace(/^https?:\/\//, '')}/s/</span><input className={input} value={s.slug || ''} onChange={(e) => set('slug', e.target.value.toLowerCase())} placeholder="your-name" /></div></label>
          {s.slug && initial.slug === s.slug && <a className="block break-all text-sm text-cyan-300 hover:underline" href={storeUrl(s.slug)} target="_blank" rel="noreferrer">{storeUrl(s.slug)} ↗</a>}
          <label className={L}>Store name<input className={`${input} mt-1`} maxLength={120} value={s.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="Your name or brand" /></label>
          <label className={L}>About<textarea className={`${input} mt-1 h-20`} maxLength={600} value={s.blurb || ''} onChange={(e) => set('blurb', e.target.value)} placeholder="What you sell and who it's for" /></label>
          <div><span className={L}>Accent color</span><div className="mt-2 flex flex-wrap gap-2">{ACCENTS.map((c) => <button key={c} type="button" aria-label={`Accent ${c}`} aria-pressed={s.accent === c} onClick={() => set('accent', c)} className={`h-9 w-9 rounded-full ring-2 ring-offset-2 ring-offset-[#141418] ${s.accent === c ? 'ring-white' : 'ring-transparent'}`} style={{ background: c }} />)}</div></div>
          <label className={L}>Support email (shown to buyers)<input className={`${input} mt-1`} type="email" value={s.support_email || ''} onChange={(e) => set('support_email', e.target.value)} placeholder="help@yourdomain.com" /></label>
        </section>
        <section className={`${card} space-y-3`}>
          <h2 className="font-bold">Delivery email</h2>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={s.email_delivery} disabled={demo} onChange={(e) => set('email_delivery', e.target.checked)} className="mt-1" /><span><b>Offer buyers an email copy of their link.</b> On the thank-you page, buyers can type their email to get the private link (preview on the right). Off by default.</span></label>
          {!platformSending && <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">Email delivery isn’t switched on for SaaS Nation yet, so no email is sent even with this on. Buyers still get their files on the download page.</p>}
        </section>
        {msg && <p role="status" className="text-sm text-cyan-200">{msg}</p>}
        {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
        <button className={btnPrimary} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
      <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Delivery email preview</div>
        <iframe title="Delivery email preview" srcDoc={preview} sandbox="" className="h-[620px] w-full rounded-2xl border border-white/10 bg-black" />
      </aside>
    </form>
  )
}
