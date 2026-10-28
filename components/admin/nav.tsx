'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/activity', label: 'Activity' },
  { href: '/admin/system', label: 'System' },
]
export function AdminNav({ current }: { current?: string }) {
  const path = usePathname()
  const at = current ?? path
  return (
    <nav aria-label="Admin" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2">
      {TABS.map((t) => {
        const on = t.href === '/admin' ? at === '/admin' : at.startsWith(t.href)
        return <Link key={t.href} href={t.href} aria-current={on ? 'page' : undefined} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold ${on ? 'bg-white text-black' : 'text-zinc-300 hover:bg-white/10'}`}>{t.label}</Link>
      })}
    </nav>
  )
}
