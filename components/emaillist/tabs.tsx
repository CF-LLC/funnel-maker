'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/email-list', label: 'Subscribers' },
  { href: '/email-list/broadcasts', label: 'Broadcasts' },
  { href: '/email-list/stats', label: 'Stats' },
  { href: '/email-list/settings', label: 'Settings' },
]
export function ElTabs() {
  const path = usePathname()
  return (
    <nav aria-label="Email list" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2">
      {TABS.map((t) => {
        const active = t.href === '/email-list' ? path === t.href : path.startsWith(t.href)
        return <Link key={t.href} href={t.href} aria-current={active ? 'page' : undefined} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition ${active ? 'bg-white text-black' : 'text-zinc-300 hover:bg-white/10'}`}>{t.label}</Link>
      })}
    </nav>
  )
}
