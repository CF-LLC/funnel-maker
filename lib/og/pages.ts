// Share-card (Open Graph / Twitter) registry: one 1200x630 PNG per public marketing page, rendered at build time by /og/<path>.png.
import type { Metadata } from 'next'
import { FREE_TOOLS, freeToolPath } from '@/lib/free-tools/registry'
import { LANDINGS, COMPARES, LANDING_PATH, COMPARE_PATH } from '@/lib/landing/registry'

export const SITE_NAME = 'SaaS Nation'
export const HOME_TITLE = 'SaaS Nation - Simple tools for coaches, creators and solo businesses'
export const HOME_DESCRIPTION = 'SaaS Nation: 18 simple tools for coaches, creators and solo businesses, including invoices, proposals, booking, forms, a client list, an email list, digital downloads and a client portal. $12/mo per tool or $29/mo for All Access, plus free no-signup tools.'
export const PRICING_DESCRIPTION = 'SaaS Nation pricing: each tool is $12/mo or $99/yr; All Access to all 18 tools is $29/mo or $249/yr. Buying a plan gives you access right away. 14-day money-back guarantee.'
export const FREE_TOOLS_DESCRIPTION = 'Free tools for freelancers, coaches and small businesses: invoice generator, late invoice kit, hourly rate calculator, UTM builder, QR code and email signature generators. No signup, they run in your browser.'

export type OgCard = { path: string; title: string; subtitle: string; colors: [string, string]; eyebrow: string }

export function ogCards(): OgCard[] {
  return [
    { path: '/', eyebrow: 'SaaS Nation', title: 'Simple tools for coaches, creators and solo businesses', subtitle: '18 tools: invoices, booking, forms, client list, email list, downloads and more. $12/mo per tool or $29/mo for all.', colors: ['#7c3aed', '#db2777'] },
    { path: '/pricing', eyebrow: 'Pricing', title: '$12/mo per tool. $29/mo for all 18.', subtitle: 'Or $99/yr per tool, $249/yr All Access. Access right away, 14-day money-back guarantee.', colors: ['#059669', '#0ea5e9'] },
    { path: '/free-tools', eyebrow: 'Free tools', title: 'Free tools, no signup', subtitle: 'Invoice generator, late invoice kit, rate calculator, UTM builder, QR codes and email signatures.', colors: ['#f59e0b', '#ef4444'] },
    ...FREE_TOOLS.map((t) => ({ path: freeToolPath(t.slug), eyebrow: 'Free tool · no signup', title: t.h1.replace(/^./, (c) => c.toUpperCase()), subtitle: t.blurb, colors: t.colors })),
    ...LANDINGS.map((l) => ({ path: `${LANDING_PATH}/${l.slug}`, eyebrow: `SaaS Nation ${l.tool}`, title: l.h1, subtitle: '$12/mo or $99/yr, or every tool for $29/mo.', colors: l.colors })),
    ...COMPARES.map((c) => ({ path: `${COMPARE_PATH}/${c.slug}`, eyebrow: 'Comparison', title: c.h1, subtitle: c.ogSubtitle, colors: c.colors })),
  ]
}

/** /og/<path>.png for a page path ('/' -> /og/home.png). */
export const ogImagePath = (path: string) => `/og/${path === '/' ? 'home' : path.replace(/^\//, '')}.png`
export function ogCardForSegments(segs: string[]): OgCard | null {
  const joined = segs.join('/').replace(/\.png$/, '')
  const path = joined === 'home' ? '/' : `/${joined}`
  return ogCards().find((c) => c.path === path) ?? null
}

/** Full page metadata: title, description, canonical, Open Graph and Twitter card with the page's share image. */
export function pageMeta(o: { title: string; description: string; path: string; type?: 'website' | 'article'; absoluteTitle?: boolean }): Metadata {
  const image = { url: ogImagePath(o.path), width: 1200, height: 630, alt: o.title }
  return {
    title: o.absoluteTitle ? { absolute: o.title } : o.title,
    description: o.description,
    alternates: { canonical: o.path },
    openGraph: { title: o.title, description: o.description, url: o.path, siteName: SITE_NAME, type: o.type ?? 'website', images: [image] },
    twitter: { card: 'summary_large_image', title: o.title, description: o.description, images: [image.url] },
  }
}
