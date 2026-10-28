'use client'

import { useEffect, useMemo, useState } from 'react'
import { buildSignature, isHexColor, safeUrl, SIG_TEMPLATES, type SigData, type SigTemplate } from '@/lib/free-tools/email-signature'

// Browser-only: details live in React memory only. Nothing is saved, sent or uploaded.
const inp = 'w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none'
const lbl = 'mb-1 block text-xs font-medium text-zinc-400'
const SWATCHES = ['#4f46e5', '#0891b2', '#059669', '#dc2626', '#d97706', '#111827']

function F({ id, label, d, set, type = 'text', ph, wide }: { id: keyof SigData; label: string; d: SigData; set: (k: keyof SigData, v: string) => void; type?: string; ph?: string; wide?: boolean }) {
  return <div className={wide ? 'sm:col-span-2' : ''}><label className={lbl} htmlFor={`sig-${id}`}>{label}</label><input id={`sig-${id}`} type={type} className={inp} value={d[id] || ''} onChange={(e) => set(id, e.target.value)} placeholder={ph} /></div>
}

function legacyCopy(fn: (e: ClipboardEvent) => void) {
  const h = (e: Event) => { fn(e as ClipboardEvent); e.preventDefault() }
  document.addEventListener('copy', h)
  try { return document.execCommand('copy') } finally { document.removeEventListener('copy', h) }
}

export function EmailSignatureGenerator() {
  const [d, setD] = useState<SigData>({ name: 'Alex Morgan', title: 'Founder', company: 'Morgan Studio', phone: '+1 555 010 2030', email: 'alex@morganstudio.co', website: 'morganstudio.co', linkedin: 'linkedin.com/in/alexmorgan' })
  const [template, setTemplate] = useState<SigTemplate>('sidebar')
  const [color, setColor] = useState('#4f46e5')
  const [localImg, setLocalImg] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const set = (k: keyof SigData, v: string) => setD((p) => ({ ...p, [k]: v }))
  useEffect(() => () => { if (localImg) URL.revokeObjectURL(localImg) }, [localImg])
  const opts = { template, color: isHexColor(color) ? color : '#4f46e5' }
  const preview = useMemo(() => buildSignature(d, { ...opts, previewImageSrc: localImg || undefined }), [d, template, color, localImg]) // eslint-disable-line react-hooks/exhaustive-deps
  const output = useMemo(() => buildSignature(d, opts), [d, template, color]) // eslint-disable-line react-hooks/exhaustive-deps
  const badUrls = (['website', 'linkedin', 'x', 'instagram', 'customUrl', 'imageUrl'] as const).filter((k) => d[k]?.trim() && !safeUrl(d[k]))
  const localOnly = !!localImg && !safeUrl(d.imageUrl)
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  async function copySignature() {
    const plain = [d.name, [d.title, d.company].filter(Boolean).join(', '), d.phone, d.email, d.website].filter(Boolean).join('\n')
    try {
      if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) throw new Error('no ClipboardItem')
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([output], { type: 'text/html' }), 'text/plain': new Blob([plain], { type: 'text/plain' }) })])
    } catch {
      if (!legacyCopy((e) => { e.clipboardData?.setData('text/html', output); e.clipboardData?.setData('text/plain', plain) })) return flash('Copy was blocked. Use "Copy HTML code" instead.')
    }
    flash(localOnly ? 'Signature copied, without your local image (it needs a hosted image URL).' : 'Signature copied. Paste it into your email settings.')
  }
  async function copyHtml() {
    try { await navigator.clipboard.writeText(output) } catch { if (!legacyCopy((e) => e.clipboardData?.setData('text/plain', output))) return flash('Copy was blocked by your browser.') }
    flash('HTML code copied.')
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,30rem)]">
      <form className="min-w-0 space-y-5" onSubmit={(e) => e.preventDefault()}>
        <div className="grid gap-3 sm:grid-cols-2">
          <F id="name" label="Full name" d={d} set={set} /><F id="title" label="Job title" d={d} set={set} />
          <F id="company" label="Company" d={d} set={set} /><F id="phone" label="Phone" type="tel" d={d} set={set} />
          <F id="email" label="Email" type="email" d={d} set={set} /><F id="website" label="Website" d={d} set={set} ph="example.com" />
          <F id="address" label="Address (optional)" d={d} set={set} wide />
        </div>
        <fieldset className="grid gap-3 rounded-xl border border-white/10 bg-zinc-900/50 p-4 sm:grid-cols-2">
          <legend className="px-1 text-sm font-bold text-white">Social links</legend>
          <F id="linkedin" label="LinkedIn" d={d} set={set} ph="linkedin.com/in/you" /><F id="x" label="X" d={d} set={set} ph="x.com/you" />
          <F id="instagram" label="Instagram" d={d} set={set} ph="instagram.com/you" /><F id="customLabel" label="Custom link label" d={d} set={set} ph="Book a call" />
          <F id="customUrl" label="Custom link URL" d={d} set={set} ph="cal.com/you" wide />
        </fieldset>
        <fieldset className="space-y-3 rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <legend className="px-1 text-sm font-bold text-white">Logo or photo (optional)</legend>
          <F id="imageUrl" label="Hosted image URL (works in every email app)" d={d} set={set} ph="https://yoursite.com/logo.png" />
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-lg border border-white/10 px-3 py-1.5 text-sm font-semibold text-zinc-200 hover:border-cyan-400">Pick a local image<input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) setLocalImg(URL.createObjectURL(f)); e.target.value = '' }} /></label>
            {localImg && <button type="button" onClick={() => setLocalImg(null)} className="text-sm text-zinc-400 underline hover:text-white">Remove local image</button>}
          </div>
          <p className="text-xs leading-relaxed text-zinc-400">A local image is shown in the preview only and never uploaded. Most email apps need a hosted image URL, so copying the signature with a local image will not carry it into Gmail or Outlook. Upload your logo to your website or a file host and paste its link above.</p>
        </fieldset>
        <fieldset className="space-y-3 rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <legend className="px-1 text-sm font-bold text-white">Style</legend>
          <div role="group" aria-label="Template" className="grid grid-cols-3 gap-1 text-sm sm:grid-cols-5">
            {SIG_TEMPLATES.map(([k, l]) => <button key={k} type="button" aria-pressed={template === k} onClick={() => setTemplate(k)} className={`rounded-lg border py-1.5 font-semibold ${template === k ? 'border-cyan-400 bg-cyan-500/15 text-cyan-100' : 'border-white/10 text-zinc-400 hover:text-white'}`}>{l}</button>)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((c) => <button key={c} type="button" aria-label={`Color ${c}`} onClick={() => setColor(c)} className={`h-7 w-7 rounded-full border-2 ${color === c ? 'border-white' : 'border-transparent'}`} style={{ background: c }} />)}
            <input aria-label="Accent color picker" type="color" value={opts.color} onChange={(e) => setColor(e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-white/10 bg-transparent" />
            <input aria-label="Accent color hex" className={`${inp} w-28 font-mono`} value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
        </fieldset>
      </form>
      <div className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-cyan-300">Live preview</p>
          <div className="overflow-x-auto rounded-xl bg-white p-5"><div data-testid="sig-preview" dangerouslySetInnerHTML={{ __html: preview }} /></div>
          {badUrls.length > 0 && <p role="alert" className="mt-3 text-xs text-amber-300">⚠ Left out (not a valid http/https link): {badUrls.join(', ')}</p>}
          {localOnly && <p className="mt-3 text-xs text-amber-300">⚠ Your local image is in the preview only. It will not be included when you copy.</p>}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={copySignature} className="rounded-xl bg-cyan-400 px-3 py-2.5 text-sm font-bold text-zinc-950 hover:bg-cyan-300">Copy signature</button>
            <button type="button" onClick={copyHtml} className="rounded-xl border border-white/15 px-3 py-2.5 text-sm font-bold text-white hover:border-cyan-400">Copy HTML code</button>
          </div>
          <p aria-live="polite" className="mt-2 min-h-[1rem] text-xs text-emerald-300">{msg}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 text-sm text-zinc-300">
          <p className="mb-2 font-bold text-white">How to add it</p>
          <ul className="space-y-2 text-xs leading-relaxed">
            <li><b className="text-zinc-100">Gmail:</b> Settings (gear) → See all settings → General → Signature → Create new. Click Copy signature, paste into the box, then Save changes at the bottom.</li>
            <li><b className="text-zinc-100">Outlook:</b> Settings → Mail → Compose and reply (or File → Options → Mail → Signatures on Windows). Add a new signature, paste, and save.</li>
            <li><b className="text-zinc-100">Apple Mail:</b> Mail → Settings → Signatures → +. Paste the signature, and untick &quot;Always match my default message font&quot; to keep the styling.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
