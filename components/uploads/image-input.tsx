'use client'
import { useRef, useState } from 'react'
import { ImagePlus, Link2, Loader2, Trash2, Upload } from 'lucide-react'
import { ACCEPT_ATTR, checkFileMeta, ERR, type UploadKind } from '@/lib/uploads/image'
import { safeHttpsUrl } from '@/lib/url-safety'

type Props = { id: string; label: string; value: string; onChange: (url: string) => void; kind: UploadKind; demo?: boolean; round?: boolean }

/** One shared image field: Upload (drag & drop / browse) or Paste URL, with preview, progress and remove. */
export function ImageInput({ id, label, value, onChange, kind, demo = false, round = false }: Props) {
  const [mode, setMode] = useState<'upload' | 'url'>(value && !value.includes('/storage/v1/object/public/') ? 'url' : 'upload')
  const [busy, setBusy] = useState(false)
  const [pct, setPct] = useState(0)
  const [err, setErr] = useState('')
  const [drag, setDrag] = useState(false)
  const [local, setLocal] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const shown = local || (safeHttpsUrl(value) ? value : null)

  function upload(file: File) {
    setErr('')
    if (demo) return setErr(ERR.demo)
    const bad = checkFileMeta(file); if (bad) return setErr(bad)
    const preview = URL.createObjectURL(file); setLocal(preview); setBusy(true); setPct(0)
    const fd = new FormData(); fd.append('file', file); fd.append('kind', kind); if (value) fd.append('replace', value)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/uploads/image')
    xhr.upload.onprogress = (e) => e.lengthComputable && setPct(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => {
      setBusy(false)
      let body: { url?: string; error?: string } = {}
      try { body = JSON.parse(xhr.responseText) } catch { /* ignore */ }
      if (xhr.status === 200 && body.url) { onChange(body.url); setLocal(null); URL.revokeObjectURL(preview) }
      else { setErr(body.error || ERR.server); setLocal(null) }
    }
    xhr.onerror = () => { setBusy(false); setLocal(null); setErr(ERR.server) }
    xhr.send(fd)
  }
  async function remove() {
    if (value && value.includes('/storage/v1/object/public/') && !demo) fetch(`/api/uploads/image?kind=${kind}&url=${encodeURIComponent(value)}`, { method: 'DELETE' }).catch(() => null)
    onChange(''); setLocal(null); setErr('')
  }
  const tab = (m: 'upload' | 'url', Icon: typeof Upload, t: string) => (
    <button type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${mode === m ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}><Icon className="h-3.5 w-3.5" />{t}</button>
  )
  return (
    <div className="space-y-2" data-image-input={id}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <div role="tablist" aria-label={`${label} source`} className="inline-flex rounded-full bg-zinc-900 p-1 ring-1 ring-white/10">{tab('upload', Upload, 'Upload')}{tab('url', Link2, 'Paste URL')}</div>
      </div>
      <div className="flex items-stretch gap-3 rounded-2xl bg-gradient-to-br from-zinc-900 to-black p-3 ring-1 ring-white/10">
        <div className={`relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden bg-zinc-800 ring-1 ring-white/10 sm:h-24 sm:w-24 ${round ? 'rounded-full' : 'rounded-xl'}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {shown ? <img src={shown} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <ImagePlus className="h-7 w-7 text-zinc-500" />}
          {busy && <div className="absolute inset-0 grid place-items-center bg-black/60 text-xs font-bold text-white"><Loader2 className="h-5 w-5 animate-spin" />{pct}%</div>}
        </div>
        <div className="min-w-0 flex-1">
          {mode === 'upload' ? (
            <div role="button" tabIndex={0} aria-label={`Upload ${label}`}
              onClick={() => !busy && inputRef.current?.click()} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) upload(f) }}
              className={`flex h-full min-h-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-3 py-3 text-center transition ${drag ? 'border-violet-400 bg-violet-500/10' : 'border-white/15 hover:border-white/40'} ${demo ? 'opacity-60' : ''}`}>
              <span className="text-sm font-semibold text-white">{busy ? 'Uploading…' : <>Drop an image or <span className="text-violet-300 underline">browse</span></>}</span>
              <span className="mt-0.5 text-[11px] text-zinc-400">PNG, JPG, WebP or GIF · max 3 MB</span>
              <input ref={inputRef} id={id} type="file" accept={ACCEPT_ATTR} className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) upload(f) }} />
            </div>
          ) : (
            <div className="flex h-full flex-col justify-center">
              <input id={id} inputMode="url" value={value} onChange={(e) => onChange(e.target.value.trim())} placeholder="https://…/photo.jpg"
                className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-zinc-500" />
              {value && !safeHttpsUrl(value) && <p className="mt-1 text-xs text-rose-400">Use an https:// image link.</p>}
            </div>
          )}
        </div>
        {(value || local) && !busy && (
          <button type="button" onClick={remove} aria-label={`Remove ${label}`} className="self-center rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button>
        )}
      </div>
      {demo && <p className="text-xs text-amber-400">Demo account: uploads are turned off. You can still paste a URL to try it.</p>}
      {err && <p role="alert" className="text-xs font-medium text-rose-400">{err}</p>}
    </div>
  )
}
