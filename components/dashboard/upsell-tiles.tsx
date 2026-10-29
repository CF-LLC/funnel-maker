import Link from 'next/link'
import { Lock } from 'lucide-react'
import type { ToolDef } from '@/tools/types'
import { ALL_ACCESS_PRICE, TOOL_PRICE } from '@/lib/plans'

/** Locked tools as upsell tiles. Prices come from lib/plans (same as /pricing); links go to /pricing only. */
export function UpsellTiles({ tools }: { tools: ToolDef[] }) {
  if (!tools.length) return null
  return (
    <section aria-labelledby="unlock-h" className="px-4 pt-6 sm:px-8" data-upsell>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 id="unlock-h" className="text-lg font-bold text-white">Unlock more tools</h2>
        <p className="text-xs text-zinc-400">Any tool {TOOL_PRICE.monthly}/mo, or every tool with All Access {ALL_ACCESS_PRICE.monthly}/mo</p>
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <li key={t.id}>
            <Link href="/pricing" data-upsell-tool={t.id} className="press group relative flex min-h-[112px] flex-col justify-between overflow-hidden rounded-2xl p-4 text-white ring-1 ring-white/10 hover:ring-white/30" style={{ background: `radial-gradient(120% 140% at 0% 0%, ${t.showcase.colors.from}55, transparent 60%), radial-gradient(120% 120% at 100% 100%, ${t.showcase.colors.to}44, transparent 60%), #111116` }}>
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-300"><Lock className="h-3.5 w-3.5" />Locked</span>
              <span className="mt-1 text-base font-bold">{t.name}</span>
              <span className="line-clamp-2 text-sm text-zinc-300">{t.showcase.cardTagline}</span>
              <span className="mt-2 text-sm font-semibold text-violet-200 group-hover:text-white">Unlock for {TOOL_PRICE.monthly}/mo →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
