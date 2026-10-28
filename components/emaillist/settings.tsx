'use client'
import { useState } from 'react'
import { SITE, publicPageUrl, type Settings } from '@/lib/emaillist/core'
import { api, btnGhost, btnPrimary, card, input } from './ui'

export function SettingsForm({ initial, demo, platformSending }: { initial: Settings; demo: boolean; platformSending: boolean }) {
  const [s, setS] = useState(initial); const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const set = (k: keyof Settings, v: unknown) => { setS({ ...s, [k]: v }); setMsg('') }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr('')
    if (demo) return setMsg('Demo account: settings aren’t saved.')
    setBusy(true); const r = await api('/api/emaillist/settings', 'PUT', s); setBusy(false)
    if (!r.ok) return setErr(r.data.error || 'Could not save.')
    setS(r.data.settings); setMsg('Saved.')
  }
  const embed = s.slug ? `<iframe src="${SITE}/e/${s.slug}/embed" style="width:100%;max-width:480px;height:340px;border:0" title="Subscribe"></iframe>` : ''
  const L = 'block text-xs font-semibold uppercase tracking-wider text-zinc-400'
  return (
    <form onSubmit={save} className="space-y-5">
      <h1 className="text-2xl font-extrabold">Settings</h1>
      <section className={`${card} space-y-3`}>
        <h2 className="font-bold">Sender</h2>
        <label className={L}>Sender name<input className={`${input} mt-1`} value={s.from_name || ''} maxLength={80} onChange={(e) => set('from_name', e.target.value)} placeholder="Your name or business" /></label>
        <p className="-mt-1 text-xs text-zinc-500">Emails show as “{s.from_name || 'Your name'} via SaaS Nation”.</p>
        <label className={L}>Reply-to email<input className={`${input} mt-1`} type="email" value={s.reply_to || ''} onChange={(e) => set('reply_to', e.target.value)} placeholder="Where replies go" /></label>
        <label className={L}>Mailing address (shown in every email)<textarea className={`${input} mt-1 h-20`} maxLength={300} value={s.mailing_address || ''} onChange={(e) => set('mailing_address', e.target.value)} placeholder="Business address or PO box" /></label>
        <p className="-mt-1 text-xs text-zinc-500">Anti-spam laws (CAN-SPAM) require a real postal address. A PO box or registered business address is fine.</p>
      </section>
      <section className={`${card} space-y-3`}>
        <h2 className="font-bold">Signup page</h2>
        <label className={L}>Page address<div className="mt-1 flex items-center gap-1"><span className="shrink-0 text-sm text-zinc-500">{SITE.replace(/^https?:\/\//, '')}/e/</span><input className={input} value={s.slug || ''} onChange={(e) => set('slug', e.target.value.toLowerCase())} placeholder="your-name" /></div></label>
        <label className={L}>Headline<input className={`${input} mt-1`} maxLength={120} value={s.page_title || ''} onChange={(e) => set('page_title', e.target.value)} placeholder={`Join ${s.from_name || 'my'} email list`} /></label>
        <label className={L}>What people get<textarea className={`${input} mt-1 h-20`} maxLength={600} value={s.page_blurb || ''} onChange={(e) => set('page_blurb', e.target.value)} placeholder="One useful email a week. No spam." /></label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={s.double_opt_in} onChange={(e) => set('double_opt_in', e.target.checked)} className="mt-1" />Ask new signups to confirm by email (double opt-in, recommended)</label>
        {s.slug && initial.slug === s.slug && <div className="space-y-2 rounded-xl bg-black/30 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2"><a className="break-all text-cyan-300 hover:underline" href={publicPageUrl(s.slug)} target="_blank" rel="noreferrer">{publicPageUrl(s.slug)}</a></div>
          <div className="text-xs text-zinc-400">Embed on your website:</div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-black/50 p-2 text-xs text-zinc-300">{embed}</pre>
          <button type="button" className={btnGhost} onClick={() => navigator.clipboard?.writeText(embed).then(() => setMsg('Embed code copied.'))}>Copy embed code</button>
        </div>}
      </section>
      <section className={`${card} space-y-3`}>
        <h2 className="font-bold">Sending</h2>
        <label className={L}>Daily limit (emails per 24 hours)<input className={`${input} mt-1 w-32`} type="number" min={1} max={1000} value={s.daily_cap} onChange={(e) => set('daily_cap', Number(e.target.value))} /></label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={s.sending_enabled} onChange={(e) => set('sending_enabled', e.target.checked)} className="mt-1" disabled={demo} /><span><b>Real sending on.</b> When off (demo mode), you can write, preview and save, but no email ever leaves, including confirmation emails.</span></label>
        {!platformSending && <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">Sending isn’t switched on for SaaS Nation yet, so nothing is sent even with this on.</p>}
      </section>
      {msg && <p role="status" className="text-sm text-cyan-200">{msg}</p>}
      {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
      <button className={btnPrimary} disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
    </form>
  )
}
