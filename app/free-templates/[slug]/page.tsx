import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LandingShell } from '@/components/landing/landing-shell'
import { CopyTemplate } from '@/components/landing/copy-template'
import { pageMeta } from '@/lib/og/pages'
import { FREE_TEMPLATES, FREE_TEMPLATES_PATH, freeTemplatePath, getFreeTemplate } from '@/lib/landing/free-templates'
import { ACCESS_LINE, PRICE_FAQ, landingPath } from '@/lib/landing/registry'
import { GUIDES, guidePath } from '@/lib/guides/registry'
import { isFeatureEnabled } from '@/lib/flags'
import { TRIAL_FAQ, TRIAL_FLAG, TRIAL_NOTE } from '@/lib/trial/copy'

export const dynamicParams = false
export const revalidate = 60
export function generateStaticParams() {
  return FREE_TEMPLATES.map((t) => ({ slug: t.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const t = getFreeTemplate((await params).slug)
  if (!t) return {}
  return pageMeta({ title: t.title, description: t.description, path: freeTemplatePath(t.slug), type: 'article' })
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const t = getFreeTemplate((await params).slug)
  if (!t) notFound()
  const trial = await isFeatureEnabled(TRIAL_FLAG).catch(() => false)
  const faqs = [...t.faqs, PRICE_FAQ, ...(trial ? [{ q: TRIAL_FAQ[0], a: TRIAL_FAQ[1] }] : [])]
  const related = FREE_TEMPLATES.filter((o) => o.slug !== t.slug)
  const article = { '@context': 'https://schema.org', '@type': 'Article', headline: t.h1, description: t.description, mainEntityOfPage: freeTemplatePath(t.slug), publisher: { '@type': 'Organization', name: 'SaaS Nation' } }
  return (
    <LandingShell eyebrow="Free template · no signup" h1={t.h1} description={t.description} colors={t.colors} faqs={faqs} crumbs={[{ name: 'Home', path: '/' }, { name: 'Free templates', path: FREE_TEMPLATES_PATH }, { name: t.h1, path: freeTemplatePath(t.slug) }]} ld={[article]}>
      <p>{t.intro}</p>
      {t.templates.map((b) => (
        <section key={b.heading} className="space-y-3">
          <h2>{b.heading}</h2>
          <CopyTemplate text={b.body} />
        </section>
      ))}
      <h2>Tips</h2>
      <ul>{t.tips.map((x) => <li key={x}>{x}</li>)}</ul>
      <section data-tool-cta className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <h2 className="!pt-0">Do this in SaaS Nation {t.tool}</h2>
        <p className="mt-2">{t.tagline}</p>
        <p className="mt-2">{`${t.tool} is $12/mo or $99/yr on its own, or included in All Access at $29/mo or $249/yr.`} {trial ? TRIAL_NOTE : ACCESS_LINE}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/pricing" className="rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-500">{trial ? 'Start 7-day free trial' : 'See pricing'}</Link>
          {t.landing && <Link href={landingPath(t.landing)} className="rounded-full border border-white/15 px-5 py-2 text-sm font-semibold hover:border-white/40">About {t.tool}</Link>}
        </div>
      </section>
      <h2>More free templates</h2>
      <ul>{related.map((o) => <li key={o.slug}><Link href={freeTemplatePath(o.slug)} className="underline">{o.h1}</Link></li>)}</ul>
      <h2>Free guides and tools</h2>
      <ul>
        {GUIDES.map((g) => <li key={g.slug}><Link href={guidePath(g.slug)} className="underline">{g.h1}</Link></li>)}
        <li><Link href="/free-tools" className="underline">Free tools (invoice generator, rate calculator and more)</Link></li>
      </ul>
    </LandingShell>
  )
}
