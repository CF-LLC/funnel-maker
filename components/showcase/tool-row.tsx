'use client'

import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Poster } from './poster'
import type { ShowcaseCard } from './types'

/** Netflix-style sideways row. Hover (mouse) grows the card and shows details; tap (touch) opens a bottom sheet. */
export function ToolRow({ title, cards, id }: { title: string; cards: ShowcaseCard[]; id?: string }) {
  const scroller = useRef<HTMLDivElement>(null)
  const [sheet, setSheet] = useState<ShowcaseCard | null>(null)
  const scrollBy = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.85, behavior: 'smooth' })
  if (cards.length === 0) return null
  return (
    <section aria-label={title} className="group/row relative" data-row={id}>
      <h2 className="mb-1 px-4 text-lg font-bold tracking-tight text-white sm:px-8 sm:text-xl">{title}</h2>
      <div className="relative">
        <button type="button" aria-label={`Scroll ${title} left`} onClick={() => scrollBy(-1)}
          className="nf-arrow left-0 bg-gradient-to-r"><ChevronLeft className="h-7 w-7" /></button>
        <div ref={scroller} className="nf-scroller flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 py-8 sm:scroll-px-8 sm:gap-4 sm:px-8">
          {cards.map((c) => <Card key={c.id} card={c} onTap={() => setSheet(c)} />)}
        </div>
        <button type="button" aria-label={`Scroll ${title} right`} onClick={() => scrollBy(1)}
          className="nf-arrow right-0 bg-gradient-to-l"><ChevronRight className="h-7 w-7" /></button>
      </div>
      <Sheet card={sheet} onClose={() => setSheet(null)} />
    </section>
  )
}

function Card({ card, onTap }: { card: ShowcaseCard; onTap: () => void }) {
  return (
    <div className="nf-card group relative w-[42vw] max-w-[200px] shrink-0 snap-start sm:w-[190px] lg:w-[210px]" data-card={card.id}>
      <Link href={card.href} aria-label={`${card.name}: ${card.tagline}`}
        onClick={(e) => { if (window.matchMedia('(hover: none)').matches) { e.preventDefault(); onTap() } }}
        className="block aspect-[3/4] overflow-hidden rounded-lg ring-1 ring-white/10">
        <Poster id={card.art} name={card.name} colors={card.colors} />
        {card.badge && <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">{card.badge}</span>}
      </Link>
      {/* Hover preview (mouse/keyboard only; hidden on touch via CSS) */}
      <div className="nf-preview" aria-hidden>
        {card.shot && <img src={card.shot} alt="" loading="lazy" className="aspect-[16/10] w-full shrink-0 object-cover object-left-top" />}
        <div className="flex flex-1 flex-col p-3" style={{ borderTop: `3px solid ${card.colors.accent}` }}>
          <p className="line-clamp-1 text-sm font-bold text-white">{card.name}</p>
          <p className="mt-0.5 text-xs leading-snug text-zinc-300">{card.tagline}</p>
          <Link href={card.href} tabIndex={-1} className="mt-auto inline-flex min-h-[34px] w-full justify-center items-center rounded-md bg-white px-3 text-xs font-bold text-black hover:bg-zinc-200">{card.cta}</Link>
        </div>
      </div>
    </div>
  )
}

function Sheet({ card, onClose }: { card: ShowcaseCard | null; onClose: () => void }) {
  const [shown, setShown] = useState<ShowcaseCard | null>(null)
  useEffect(() => { if (card) setShown(card) }, [card])
  useEffect(() => {
    if (!card) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [card, onClose])
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const open = !!card
  const c = shown
  if (!mounted) return null
  return createPortal(
    <div className={`fixed inset-0 z-[60] ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div onClick={onClose} className={`absolute inset-0 bg-black/70 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`} />
      <div role="dialog" aria-modal="true" aria-label={c?.name}
        className={`absolute inset-x-0 bottom-0 max-h-[85svh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-zinc-900 pb-[max(1rem,env(safe-area-inset-bottom))] transition-transform duration-300 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        {c && (
          <>
            <div className="relative">
              {c.shot ? <img src={c.shot} alt={`${c.name} screenshot`} className="aspect-[16/10] w-full object-cover object-top" />
                : <div className="aspect-[16/10]"><Poster id={c.art} name={c.name} colors={c.colors} /></div>}
              <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5">
              <h3 className="text-2xl font-black text-white">{c.name}</h3>
              <p className="mt-1 text-zinc-300">{c.tagline}</p>
              <Link href={c.href} className="mt-4 flex min-h-[48px] items-center justify-center rounded-md font-bold text-black" style={{ background: c.colors.accent }}>{c.cta}</Link>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
