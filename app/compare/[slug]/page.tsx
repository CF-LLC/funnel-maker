import { pageMeta } from '@/lib/og/pages'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LandingShell } from '@/components/landing/landing-shell'
import { ACCESS_LINE, COMPARES, comparePath, getCompare, landingPath } from '@/lib/landing/registry'

export const dynamicParams = false
export function generateStaticParams() {
  return COMPARES.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = getCompare((await params).slug)
  if (!c) return {}
  return pageMeta({ title: c.title, description: c.description, path: comparePath(c.slug), type: 'article' })
}

// Honest comparisons: what SaaS Nation offers and costs. No competitor prices or feature claims.
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const c = getCompare((await params).slug)
  if (!c) notFound()
  const more = COMPARES.filter((o) => o.slug !== c.slug)
  return (
    <LandingShell eyebrow="Comparison" h1={c.h1} description={c.description} colors={c.colors} faqs={c.faqs} crumbs={[{ name: 'Home', path: '/' }, { name: c.h1, path: comparePath(c.slug) }]}>
      <p>{c.intro}</p>
      <h2>Side by side</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-white/10 text-white"><th className="py-2 pr-4">Job</th><th className="py-2 pr-4">Separate app</th><th className="py-2">In SaaS Nation</th></tr></thead>
          <tbody>{c.rows.map((r) => <tr key={r[0]} className="border-b border-white/5"><td className="py-2 pr-4">{r[0]}</td><td className="py-2 pr-4">{r[1]}</td><td className="py-2">{r[2]}</td></tr>)}</tbody>
        </table>
      </div>
      <h2>Price</h2>
      <p>All Access is $29/mo or $249/yr and includes every SaaS Nation tool, including future ones. One tool on its own is $12/mo or $99/yr. {ACCESS_LINE} For the current prices of {c.others}, check their own pricing pages.</p>
      <h2>When to pick which</h2>
      <ul>
        <li><strong>Pick {c.others}</strong> if you need features beyond the basics listed above.</li>
        <li><strong>Pick SaaS Nation</strong> if you want simple versions of these jobs in one place, with one login and one bill.</li>
      </ul>
      <p>Read more: {c.links.map(([s, n], i) => <span key={s}>{i > 0 && ', '}<Link href={landingPath(s)} className="underline">{n}</Link></span>)}, or <Link href="/pricing" className="underline">see pricing</Link>.</p>
      <h2>More comparisons</h2>
      <ul>{more.map((o) => <li key={o.slug}><Link href={comparePath(o.slug)} className="underline">{o.h1}</Link></li>)}</ul>
    </LandingShell>
  )
}
