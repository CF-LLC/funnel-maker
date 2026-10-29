import Link from 'next/link'
import type { DigestCounts } from '@/lib/digest'

const ITEMS: { k: keyof DigestCounts; label: string; href: string }[] = [
  { k: 'leads', label: 'Funnel leads', href: '/funnels' },
  { k: 'responses', label: 'Form responses', href: '/forms' },
  { k: 'bookings', label: 'Bookings', href: '/booking' },
  { k: 'invoicesPaid', label: 'Invoices paid', href: '/invoices' },
  { k: 'reviews', label: 'Reviews', href: '/testimonials' },
]

/** Activity / results, last 30 days, from the user's own rows. Real counts only; zeros show as zeros. */
export function ResultsPanel({ c }: { c: DigestCounts }) {
  return (
    <section aria-labelledby="results-h" className="px-4 pt-6 sm:px-8" data-results>
      <h2 id="results-h" className="text-lg font-bold text-white">Your results <span className="text-sm font-normal text-zinc-400">last 30 days</span></h2>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ITEMS.map((i) => (
          <li key={i.k}>
            <Link href={i.href} className="press block rounded-2xl bg-[#121217] p-4 ring-1 ring-white/10 hover:ring-white/25">
              <div className="text-2xl font-black text-white">{c[i.k]}</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{i.label}</div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
