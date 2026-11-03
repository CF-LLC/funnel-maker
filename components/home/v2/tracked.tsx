'use client'
import Link from 'next/link'
import { useEffect, type ReactNode } from 'react'
import { trackEvent } from '@/lib/site-events/client'

/** Fires home_view once on mount. */
export function HomeView() {
  useEffect(() => { trackEvent('home_view') }, [])
  return null
}

/** Link that fires a homepage event (props go in the `tool` field, the only free-form slug column). */
export function TrackedLink({ href, event, tool, className, children }: { href: string; event: string; tool?: string; className?: string; children: ReactNode }) {
  return <Link href={href} className={className} data-event={event} onClick={() => trackEvent(event, tool ? { tool } : {})}>{children}</Link>
}

export function FaqItem({ n, q, children }: { n: number; q: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl bg-white/5 p-4 ring-1 ring-white/10" data-faq={n} onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) trackEvent('faq_open', { tool: String(n) }) }}>
      <summary className="cursor-pointer list-none text-base font-semibold text-white">{q}</summary>
      <div className="mt-2 text-sm leading-relaxed text-zinc-300">{children}</div>
    </details>
  )
}
