'use client'

import { useMemo, useState } from 'react'
import { buildPayload, contrastWarning, makeMatrix, matrixToRgba, matrixToSvg, type Ecl, type QrFields, type QrKind } from '@/lib/free-tools/qr'

// Browser-only: state lives in React memory only. No browser storage, no network calls, no QR API.
const inp = 'w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none'
const lbl = 'mb-1 block text-xs font-medium text-zinc-400'
const KINDS: [QrKind, string][] = [['url', 'Link'], ['text', 'Text'], ['wifi', 'Wi-Fi'], ['email', 'Email'], ['phone', 'Phone'], ['vcard', 'Contact']]

function T({ id, label, f, set, type = 'text', ph }: { id: keyof QrFields; label: string; f: QrFields; set: (k: keyof QrFields, v: string) => void; type?: string; ph?: string }) {
  return <div><label className={lbl} htmlFor={id}>{label}</label><input id={id} type={type} autoCapitalize="off" className={inp} value={(f[id] as string) || ''} onChange={(e) => set(id, e.target.value)} placeholder={ph} /></div>
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a')
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function QrCodeGenerator() {
  const [kind, setKind] = useState<QrKind>('url')
  const [f, setF] = useState<QrFields>({ url: 'saasnation.site', security: 'WPA' })
  const [fg, setFg] = useState('#111111')
  const [bg, setBg] = useState('#ffffff')
  const [px, setPx] = useState(512)
  const [ecl, setEcl] = useState<Ecl>('M')
  const [margin, setMargin] = useState(4)
  const set = (k: keyof QrFields, v: string | boolean) => setF((p) => ({ ...p, [k]: v }))
  const payload = useMemo(() => buildPayload(kind, f), [kind, f])
  const qr = useMemo(() => {
    if (!payload.ok) return { err: payload.error }
    try { return { m: makeMatrix(payload.data, ecl) } } catch { return { err: 'Too much content for one QR code. Shorten it or lower error correction.' } }
  }, [payload, ecl])
  const warn = contrastWarning(fg, bg)
  const opts = { fg, bg, margin, px }
  const svg = qr.m ? matrixToSvg(qr.m, opts) : ''

  function downloadPng() {
    if (!qr.m) return
    const img = matrixToRgba(qr.m, opts)
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height
    cv.getContext('2d')!.putImageData(new ImageData(img.data, img.width, img.height), 0, 0)
    cv.toBlob((b) => b && save(b, `qr-${kind}.png`), 'image/png')
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,26rem)]">
      <form className="min-w-0 space-y-5" onSubmit={(e) => e.preventDefault()}>
        <div role="group" aria-label="Content type" className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 p-1 text-sm sm:grid-cols-6">
          {KINDS.map(([k, l]) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={`rounded-lg py-1.5 font-semibold ${kind === k ? 'bg-amber-500/20 text-amber-200' : 'text-zinc-400 hover:text-white'}`}>{l}</button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {kind === 'url' && <div className="sm:col-span-2"><T id="url" label="Website URL" f={f} set={set} ph="example.com/menu" /></div>}
          {kind === 'text' && <div className="sm:col-span-2"><label className={lbl} htmlFor="text">Text</label><textarea id="text" rows={4} className={inp} value={f.text || ''} onChange={(e) => set('text', e.target.value)} /></div>}
          {kind === 'wifi' && <>
            <T id="ssid" label="Network name (SSID)" f={f} set={set} />
            <div><label className={lbl} htmlFor="security">Security</label><select id="security" className={inp} value={f.security} onChange={(e) => set('security', e.target.value)}><option value="WPA">WPA/WPA2/WPA3</option><option value="WEP">WEP</option><option value="nopass">No password</option></select></div>
            {f.security !== 'nopass' && <T id="password" label="Password" f={f} set={set} />}
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-zinc-300"><input type="checkbox" checked={!!f.hidden} onChange={(e) => set('hidden', e.target.checked)} className="accent-amber-400" /> Hidden network</label>
          </>}
          {kind === 'email' && <>
            <div className="sm:col-span-2"><T id="email" label="Email address" type="email" f={f} set={set} /></div>
            <T id="subject" label="Subject (optional)" f={f} set={set} />
            <T id="body" label="Message (optional)" f={f} set={set} />
          </>}
          {kind === 'phone' && <div className="sm:col-span-2"><T id="phone" label="Phone number" type="tel" f={f} set={set} ph="+1 555 123 4567" /></div>}
          {kind === 'vcard' && <>
            <T id="firstName" label="First name" f={f} set={set} /><T id="lastName" label="Last name" f={f} set={set} />
            <T id="org" label="Company" f={f} set={set} /><T id="title" label="Job title" f={f} set={set} />
            <T id="vPhone" label="Phone" type="tel" f={f} set={set} /><T id="vEmail" label="Email" type="email" f={f} set={set} />
            <div className="sm:col-span-2"><T id="website" label="Website" f={f} set={set} /></div>
          </>}
        </div>
        <fieldset className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <legend className="px-1 text-sm font-bold text-white">Style</legend>
          {([['fg', 'Foreground', fg, setFg], ['bg', 'Background', bg, setBg]] as const).map(([id, l, v, s]) => (
            <div key={id}><label className={lbl} htmlFor={id}>{l}</label><div className="flex gap-2"><input aria-label={`${l} color picker`} type="color" value={/^#[0-9a-f]{6}$/i.test(v) ? v : '#000000'} onChange={(e) => s(e.target.value)} className="h-9 w-10 shrink-0 cursor-pointer rounded border border-white/10 bg-transparent" /><input id={id} className={`${inp} font-mono`} value={v} onChange={(e) => s(e.target.value)} /></div></div>
          ))}
          <div><label className={lbl} htmlFor="px">Size: ~{px}px</label><input id="px" type="range" min={128} max={1024} step={32} value={px} onChange={(e) => setPx(Number(e.target.value))} className="w-full accent-amber-400" /></div>
          <div><label className={lbl} htmlFor="margin">Margin: {margin} modules</label><input id="margin" type="range" min={0} max={8} value={margin} onChange={(e) => setMargin(Number(e.target.value))} className="w-full accent-amber-400" /></div>
          <div className="col-span-2"><label className={lbl} htmlFor="ecl">Error correction</label><select id="ecl" className={inp} value={ecl} onChange={(e) => setEcl(e.target.value as Ecl)}><option value="L">L – smallest code (7%)</option><option value="M">M – standard (15%)</option><option value="Q">Q – sturdier (25%)</option><option value="H">H – most damage-proof (30%)</option></select></div>
          {warn ? <p role="alert" className="col-span-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">⚠ {warn}</p> : null}
          {margin < 2 ? <p className="col-span-2 text-xs text-zinc-400">Tip: keep a margin of 2–4 modules so cameras can find the code.</p> : null}
        </fieldset>
      </form>

      <section aria-live="polite" className="min-w-0 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/25 via-zinc-900 to-red-600/25 p-5 shadow-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-200">Live preview</p>
          {qr.m ? (
            <div data-testid="qr" className="mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-lg [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
          ) : <div className="flex aspect-square w-full max-w-xs items-center justify-center rounded-lg border border-dashed border-white/15 p-6 text-center text-sm text-zinc-400 mx-auto">{qr.err}</div>}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" disabled={!qr.m} onClick={downloadPng} className="rounded-xl bg-amber-400 py-2.5 font-bold text-zinc-950 hover:bg-amber-300 disabled:opacity-40">Download PNG</button>
            <button type="button" disabled={!qr.m} onClick={() => save(new Blob([svg], { type: 'image/svg+xml' }), `qr-${kind}.svg`)} className="rounded-xl border border-white/20 py-2.5 font-bold text-white hover:bg-white/10 disabled:opacity-40">Download SVG</button>
          </div>
          {qr.m ? <p className="mt-3 text-center text-xs text-zinc-400">{qr.m.size}×{qr.m.size} modules · test it with your phone camera before printing.</p> : null}
        </div>
      </section>
    </div>
  )
}
