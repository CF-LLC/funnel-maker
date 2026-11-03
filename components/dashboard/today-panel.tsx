import Link from 'next/link'
import { TODAY_EMPTY, type TodayItem } from '@/lib/me/today-core'

/** "What needs me today" (workspace_v2). Only real counts from the user's own rows. */
export function TodayPanel({ items }: { items: TodayItem[] }) {
  return (
    <section aria-labelledby="today-h" className="px-4 pt-4 sm:px-8" data-today>
      <h2 id="today-h" className="text-lg font-bold text-white">Today</h2>
      {items.length === 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#121217] p-4 ring-1 ring-white/10" data-today-empty>
          <p className="text-sm text-zinc-300">{TODAY_EMPTY.text}</p>
          <Link href={TODAY_EMPTY.href} className="press rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">{TODAY_EMPTY.cta}</Link>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((i) => (
            <li key={i.id} data-today-item={i.id}>
              <Link href={i.href} className="press flex items-center justify-between gap-3 rounded-2xl bg-[#121217] p-4 ring-1 ring-white/10 hover:ring-white/25">
                <span className="text-sm text-white">{i.text}</span>
                <span className="shrink-0 text-xs font-semibold text-zinc-400">{i.cta} →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
