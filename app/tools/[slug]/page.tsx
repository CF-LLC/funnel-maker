import { pageMeta } from '@/lib/og/pages'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LandingShell } from '@/components/landing/landing-shell'
import { ACCESS_LINE, COMPARES, LANDINGS, comparePath, getLanding, landingPath } from '@/lib/landing/registry'
import { softwareAppLd } from '@/lib/seo/schema'

export const dynamicParams = false
export function generateStaticParams() {
  return LANDINGS.map((l) => ({ slug: l.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const l = getLanding((await params).slug)
  if (!l) return {}
  return pageMeta({ title: l.title, description: l.description, path: landingPath(l.slug) })
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const l = getLanding((await params).slug)
  if (!l) notFound()
  const others = LANDINGS.filter((o) => o.slug !== l.slug)
  return (
    <LandingShell eyebrow={`SaaS Nation ${l.tool}`} h1={l.h1} description={l.description} colors={l.colors} faqs={l.faqs} crumbs={[{ name: 'Home', path: '/' }, { name: 'Tools', path: '/pricing' }, { name: l.h1, path: landingPath(l.slug) }]} ld={[softwareAppLd({ name: `SaaS Nation ${l.tool}`, description: l.description, path: landingPath(l.slug), includedOnly: l.tool === 'Link-in-bio' })]}>
      <h2>What you get</h2>
      <ul>{l.points.map((p) => <li key={p}>{p}</li>)}</ul>
      <h2>Price</h2>
      <p>{l.tool === 'Link-in-bio' ? 'Included with any paid plan.' : `${l.tool} is $12/mo or $99/yr on its own, or included in All Access at $29/mo or $249/yr.`} {ACCESS_LINE} <Link href="/pricing" className="underline">See pricing</Link>.</p>
      <h2>Other SaaS Nation tools</h2>
      <ul>{others.map((o) => <li key={o.slug}><Link href={landingPath(o.slug)} className="underline">{o.h1}</Link></li>)}</ul>
      {COMPARES.some((c) => c.links.some(([s]) => s === l.slug)) && <><h2>Comparisons</h2><ul>{COMPARES.filter((c) => c.links.some(([s]) => s === l.slug)).map((c) => <li key={c.slug}><Link href={comparePath(c.slug)} className="underline">{c.h1}</Link></li>)}</ul></>}
    </LandingShell>
  )
}
