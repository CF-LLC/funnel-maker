import Link from 'next/link'
import { ArrowUpRight, Link2 } from 'lucide-react'
import type { WsSection } from '@/lib/clients/workspace-core'
import { shortDate } from './bits'

/** workspace_v2: compact per-tool sections on the client page. Rows are linked by email only. */
export function ClientWorkspace({ sections }: { sections: WsSection[] }) {
  if (!sections.length) return null
  return (
    <section aria-labelledby="ws-h" data-testid="client-workspace">
      <h2 id="ws-h" className="text-sm font-bold uppercase tracking-wider text-zinc-300">Across your tools</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {sections.map((s) => (
          <div key={s.tool} className="cine-glass flex flex-col rounded-2xl p-4" data-tool={s.tool}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold">{s.label}</h3>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-zinc-200" aria-label={`${s.count} linked`}>{s.status || s.count}</span>
            </div>
            {s.rows.length ? (
              <ul className="mt-2 space-y-1.5">
                {s.rows.map((r) => (
                  <li key={r.id}>
                    <Link href={r.href} className="group block rounded-lg p-1.5 -mx-1.5 hover:bg-white/[0.04]">
                      <p className="flex items-center gap-1 truncate text-sm group-hover:text-rose-200"><span className="truncate">{r.title}</span><ArrowUpRight className="h-3 w-3 shrink-0 opacity-50" /></p>
                      <p className="truncate text-[11px] text-zinc-500">{[r.at ? shortDate(r.at) : null, r.meta].filter(Boolean).join(' · ')}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-zinc-500">{s.empty}</p>}
            {s.unlinked > 0 && (
              <Link href={s.href} className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-200/90 hover:text-amber-100"><Link2 className="h-3 w-3" />{s.unlinked} with no email · Add an email to link</Link>
            )}
            <Link href={s.href} className="mt-auto pt-3 text-xs font-semibold text-zinc-400 hover:text-white">Open {s.label} →</Link>
          </div>
        ))}
      </div>
    </section>
  )
}
