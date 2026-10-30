'use client'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export const btn = 'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50'
export const btnPrimary = `${btn} bg-white text-black hover:bg-zinc-200`
export const btnGhost = `${btn} border border-white/15 text-zinc-200 hover:bg-white/10`
export const btnDanger = `${btn} bg-red-600 text-white hover:bg-red-500`
export const input = 'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400/60 focus:outline-none'
export const card = 'cine-glass rounded-2xl border border-white/10 p-4 sm:p-5'

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!open) return null
  // Portal to <body>: the .page-enter wrapper keeps a transform, which would make `fixed` relative to the page, not the screen.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#141418] p-5 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button onClick={onClose} aria-label="Close" className="rounded-full px-2 text-2xl leading-none text-zinc-400 hover:text-white">×</button></div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return <div className={card}><div className="text-xs uppercase tracking-wider text-zinc-400">{label}</div><div className="mt-1 text-2xl font-extrabold sm:text-3xl">{value}</div>{hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}</div>
}

export async function api(url: string, method: string, body?: unknown): Promise<{ ok: boolean; data: any }> {
  const r = await fetch(url, { method, headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
  const data = await r.json().catch(() => ({}))
  return { ok: r.ok, data }
}
export const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '')
