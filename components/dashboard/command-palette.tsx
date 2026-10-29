'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

export type PaletteItem = { label: string; href: string; group: 'Create' | 'Go to' }

export const QUICK_CREATE: PaletteItem[] = [
  { label: 'New funnel', href: '/funnels/templates', group: 'Create' },
  { label: 'New invoice', href: '/invoices/new', group: 'Create' },
  { label: 'New proposal', href: '/proposals/new', group: 'Create' },
]

/** Search + quick create. Opens with Ctrl/Cmd+K or the search buttons (custom event 'sn:palette'). Navigation only. */
export function CommandPalette({ items }: { items: PaletteItem[] }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const router = useRouter()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o) }
      if (e.key === 'Escape') setOpen(false)
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey); window.addEventListener('sn:palette', onOpen)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('sn:palette', onOpen) }
  }, [])
  useEffect(() => { if (open) { setQ(''); setI(0); setTimeout(() => input.current?.focus(), 0) } }, [open])
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return items.filter((x) => !s || x.label.toLowerCase().includes(s) || x.href.includes(s))
  }, [q, items])
  if (!open) return null
  const go = (x?: PaletteItem) => { if (!x) return; setOpen(false); router.push(x.href) }
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 p-3 pt-[12vh]" onClick={() => setOpen(false)}>
      <div role="dialog" aria-label="Search and create" data-palette onClick={(e) => e.stopPropagation()} className="w-full max-w-lg overflow-hidden rounded-2xl bg-[#121217] text-zinc-100 shadow-2xl ring-1 ring-white/15">
        <label className="flex items-center gap-2 border-b border-white/10 px-4">
          <Search className="h-4 w-4 text-zinc-400" /><span className="sr-only">Search</span>
          <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setI(0) }} onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setI((n) => Math.min(n + 1, list.length - 1)) } if (e.key === 'ArrowUp') { e.preventDefault(); setI((n) => Math.max(n - 1, 0)) } if (e.key === 'Enter') go(list[i]) }} placeholder="Search tools or create something…" className="min-h-[52px] w-full bg-transparent text-base outline-none placeholder:text-zinc-500" />
        </label>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {list.length === 0 && <li className="px-3 py-6 text-center text-sm text-zinc-500">No matches.</li>}
          {list.map((x, n) => (
            <li key={x.group + x.href}>
              <button onMouseEnter={() => setI(n)} onClick={() => go(x)} className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm ${n === i ? 'bg-white/10' : ''}`}>
                <span className="w-14 shrink-0 text-[11px] font-bold uppercase tracking-wider text-zinc-500">{x.group}</span>{x.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export const openPalette = () => window.dispatchEvent(new Event('sn:palette'))
