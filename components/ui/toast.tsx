'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, Info } from 'lucide-react'

type Kind = 'success' | 'error' | 'info'
type T = { id: number; kind: Kind; text: string }
let push: ((t: T) => void) | null = null
let n = 0

/** Fire-and-forget toast. Safe to call anywhere on the client; no-op before the Toaster mounts. */
export function toast(text: string, kind: Kind = 'success') {
  push?.({ id: ++n, kind, text })
}

export function Toaster() {
  const [items, setItems] = useState<T[]>([])
  useEffect(() => {
    push = (t) => {
      setItems((xs) => [...xs.slice(-2), t])
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), t.kind === 'error' ? 6000 : 3200)
    }
    return () => { push = null }
  }, [])
  const Icon = { success: CheckCircle2, error: AlertCircle, info: Info }
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:pr-6">
      {items.map((t) => {
        const I = Icon[t.kind]
        return (
          <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'}
            className={`toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white/95 px-4 py-3 text-sm font-medium shadow-xl backdrop-blur ${t.kind === 'error' ? 'border-red-200 text-red-800' : 'border-violet-200 text-gray-900'}`}>
            <I className={`mt-0.5 h-4 w-4 shrink-0 ${t.kind === 'error' ? 'text-red-600' : t.kind === 'success' ? 'text-emerald-600' : 'text-violet-600'}`} />
            <span>{t.text}</span>
          </div>
        )
      })}
    </div>
  )
}
