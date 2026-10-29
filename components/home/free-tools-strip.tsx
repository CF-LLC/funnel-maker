import Link from 'next/link'
import { FREE_TOOLS, FREE_TOOLS_PATH, freeToolPath } from '@/lib/free-tools/registry'

export function FreeToolsStrip() {
  return (
    <nav aria-label="Free tools" className="mt-6 max-w-2xl" data-free-strip>
      <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Try free, no signup</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {FREE_TOOLS.map((t) => (
          <li key={t.slug}><Link href={freeToolPath(t.slug)} className="inline-flex min-h-[36px] items-center rounded-full bg-white/10 px-3 text-sm font-semibold text-white ring-1 ring-white/15 hover:bg-white/20">{t.name}</Link></li>
        ))}
        <li><Link href={FREE_TOOLS_PATH} className="inline-flex min-h-[36px] items-center px-2 text-sm font-semibold text-emerald-300 underline-offset-4 hover:underline">All free tools →</Link></li>
      </ul>
    </nav>
  )
}
