import Link from 'next/link'

/** Sticky banner on demo accounts' public pages. */
export function DemoBanner() {
  return (
    <div role="note" className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-neutral-950 px-4 py-2 text-sm text-white shadow">
      <span>Demo page made with SaaS Nation</span>
      <Link href="/auth/register" className="rounded-full bg-violet-600 px-3 py-1 font-semibold text-white hover:bg-violet-500">Start building</Link>
    </div>
  )
}
