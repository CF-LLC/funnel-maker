'use client'

import { useMemo, useState } from 'react'
import { UTM_PRESETS, buildMany, buildUtmUrl } from '@/lib/free-tools/utm'

// Browser-only: state lives in React memory only. No browser storage, no network calls.
const inp = 'w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none'
const lbl = 'mb-1 block text-xs font-medium text-zinc-400'

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(text) } catch {
      const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove()
    }
    setDone(true); setTimeout(() => setDone(false), 1500)
  }
  return <button type="button" onClick={copy} className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-emerald-400">{done ? 'Copied!' : label}</button>
}

export function UtmBuilder() {
  const [url, setUrl] = useState('')
  const [p, setP] = useState({ source: '', medium: '', campaign: '', term: '', content: '' })
  const [doTidy, setDoTidy] = useState(true)
  const [mode, setMode] = useState<'one' | 'many'>('one')
  const [many, setMany] = useState('google/cpc\nfacebook/paid_social\nnewsletter/email\nx/social')
  const set = (k: keyof typeof p) => (e: React.ChangeEvent<HTMLInputElement>) => setP((s) => ({ ...s, [k]: e.target.value }))
  const one = useMemo(() => buildUtmUrl(url, p, { tidy: doTidy }), [url, p, doTidy])
  const rows = useMemo(() => buildMany(url, many, p, { tidy: doTidy }), [url, many, p, doTidy])
  const started = url.trim() !== ''
  const allOk = rows.filter((r) => r.result.ok).map((r) => (r.result as { url: string }).url)

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <form className="min-w-0 space-y-5" onSubmit={(e) => e.preventDefault()}>
        <div><label className={lbl} htmlFor="url">Website URL</label><input id="url" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} className={inp} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="example.com/landing?ref=home#signup" /></div>
        <div role="group" aria-label="Mode" className="flex w-full rounded-xl border border-white/10 p-1 text-sm">
          {([['one', 'One link'], ['many', 'Build several']] as const).map(([m, l]) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`flex-1 rounded-lg py-1.5 font-semibold ${mode === m ? 'bg-emerald-500/20 text-emerald-200' : 'text-zinc-400'}`}>{l}</button>
          ))}
        </div>
        {mode === 'one' ? (
          <div>
            <p className={lbl}>Quick picks</p>
            <div className="flex flex-wrap gap-2">
              {UTM_PRESETS.map((x) => (
                <button key={x.label} type="button" onClick={() => setP((s) => ({ ...s, source: x.source, medium: x.medium }))} className={`rounded-full border px-3 py-1 text-xs ${p.source === x.source && p.medium === x.medium ? 'border-emerald-400 bg-emerald-400/15 text-emerald-100' : 'border-white/10 text-zinc-300 hover:border-white/30'}`}>{x.source}/{x.medium}</button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          {mode === 'one' ? <div><label className={lbl} htmlFor="source">Source *</label><input id="source" className={inp} value={p.source} onChange={set('source')} placeholder="google" /></div> : null}
          <div><label className={lbl} htmlFor="medium">{mode === 'one' ? 'Medium *' : 'Default medium'}</label><input id="medium" className={inp} value={p.medium} onChange={set('medium')} placeholder="cpc" /></div>
          <div className={mode === 'one' ? 'col-span-2' : ''}><label className={lbl} htmlFor="campaign">Campaign *</label><input id="campaign" className={inp} value={p.campaign} onChange={set('campaign')} placeholder="spring_sale" /></div>
          <div><label className={lbl} htmlFor="term">Term (optional)</label><input id="term" className={inp} value={p.term} onChange={set('term')} placeholder="running shoes" /></div>
          <div><label className={lbl} htmlFor="content">Content (optional)</label><input id="content" className={inp} value={p.content} onChange={set('content')} placeholder="hero_button" /></div>
        </div>
        {mode === 'many' ? (
          <div><label className={lbl} htmlFor="many">Sources, one per line (source or source/medium)</label><textarea id="many" rows={5} className={`${inp} font-mono`} value={many} onChange={(e) => setMany(e.target.value)} /></div>
        ) : null}
        <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={doTidy} onChange={(e) => setDoTidy(e.target.checked)} className="h-4 w-4 accent-emerald-400" /> Tidy values (lowercase, spaces → underscores)</label>
      </form>

      <section aria-live="polite" className="min-w-0 space-y-6 lg:sticky lg:top-20 lg:self-start">
        {mode === 'one' ? (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-600/25 via-zinc-900 to-sky-700/25 p-5 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200">Your tracked link</p>
            {one.ok ? (
              <>
                <p data-testid="built" className="mt-3 break-all rounded-lg bg-black/40 p-3 font-mono text-sm text-zinc-100">{one.url}</p>
                <div className="mt-3 flex justify-end"><CopyButton text={one.url} /></div>
              </>
            ) : <p className="mt-3 text-sm text-zinc-400">{started ? one.error : 'Enter a URL, source, medium and campaign to build your link.'}</p>}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200">{allOk.length} link{allOk.length === 1 ? '' : 's'}</p>
              {allOk.length > 1 ? <CopyButton text={allOk.join('\n')} label="Copy all" /> : null}
            </div>
            <ul className="space-y-3">
              {rows.map((r, i) => (
                <li key={i} className="rounded-lg bg-black/30 p-3">
                  <p className="text-xs font-semibold text-zinc-300">{r.source || '?'} / {r.medium || '?'}</p>
                  {r.result.ok ? (
                    <div className="mt-1 flex items-start gap-2"><p className="min-w-0 flex-1 break-all font-mono text-xs text-zinc-100">{r.result.url}</p><CopyButton text={r.result.url} /></div>
                  ) : <p className="mt-1 text-xs text-zinc-400">{started ? r.result.error : 'Enter a URL and campaign.'}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
          <h2 className="text-base font-bold text-white">What are UTMs?</h2>
          <p>UTM tags are bits added to the end of a link, like <code className="text-emerald-300">?utm_source=newsletter</code>. When someone clicks, your analytics tool reads them and tells you exactly which post, ad or email sent the visit.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><b>Source</b> is where the click came from (google, newsletter, x). <b>Medium</b> is the channel type (cpc, email, social). <b>Campaign</b> groups everything for one push.</li>
            <li>Pick one naming style and stick to it. <code>Facebook</code>, <code>facebook</code> and <code>fb</code> show up as three different sources.</li>
            <li>Use lowercase and underscores, never spaces. Keep the tidy option on.</li>
            <li>Use <b>content</b> to tell two links in the same post or email apart (hero_button vs footer_link).</li>
            <li>Don’t put UTMs on links inside your own site. They restart the visit and muddy your data.</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
