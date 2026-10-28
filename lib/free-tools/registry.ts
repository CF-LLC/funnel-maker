// Free, no-signup, browser-only tools. Add one entry here when a tool ships;
// the /free-tools index, sitemap and shared layout all read from this list.
export type FreeTool = {
  slug: string
  name: string
  /** SEO <title> (without site suffix) */
  title: string
  h1: string
  description: string
  /** Short card copy for the index grid */
  blurb: string
  /** Paid tool this one feeds (soft CTA target) */
  feeds: { name: string; href: string }
  /** Gradient colors for the card art */
  colors: [string, string]
  emoji: string
}

export const FREE_TOOLS_PATH = '/free-tools'
export const FREE_TOOLS_CTA = 'Want this saved and automated? $12/mo or $99/yr'

export const FREE_TOOLS: FreeTool[] = [
  {
    slug: 'invoice-generator',
    name: 'Invoice generator',
    title: 'Free Invoice Generator – Make a PDF Invoice, No Signup',
    h1: 'Free invoice generator',
    description: 'Free invoice generator: add your details, line items, tax and notes, see a live preview, and download a clean PDF invoice. No signup, nothing stored.',
    blurb: 'Fill it in, watch the live preview, download a clean PDF. No signup.',
    feeds: { name: 'Invoices', href: '/pricing' },
    colors: ['#7c3aed', '#db2777'],
    emoji: '🧾',
  },
]

export const freeToolPath = (slug: string) => `${FREE_TOOLS_PATH}/${slug}`
export const getFreeTool = (slug: string) => FREE_TOOLS.find((t) => t.slug === slug)

export function freeToolJsonLd(t: FreeTool, siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: t.h1.replace(/^./, (c) => c.toUpperCase()),
    url: `${siteUrl.replace(/\/$/, '')}${freeToolPath(t.slug)}`,
    description: t.description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any (runs in your browser)',
    browserRequirements: 'Requires JavaScript',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }
}
