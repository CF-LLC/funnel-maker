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
    description: 'Free invoice generator: add your details, line items, tax and notes, see a live preview, and download a clean PDF invoice. No signup, and what you type is never stored.',
    blurb: 'Fill it in, watch the live preview, download a clean PDF. No signup.',
    feeds: { name: 'Invoices', href: '/pricing' },
    colors: ['#7c3aed', '#db2777'],
    emoji: '🧾',
  },
  {
    slug: 'hourly-rate-calculator',
    name: 'Hourly rate calculator',
    title: 'Freelance Hourly Rate Calculator – Free, No Signup',
    h1: 'Freelance hourly rate calculator',
    description: 'Free freelance hourly rate calculator: enter your target income, expenses, taxes and time off to get your hourly, day and project rates. No signup.',
    blurb: 'Income, expenses, taxes, time off in. Hourly, day and project rates out.',
    feeds: { name: 'Proposals & Invoices', href: '/pricing' },
    colors: ['#0891b2', '#7c3aed'],
    emoji: '⏱️',
  },
  {
    slug: 'utm-builder',
    name: 'UTM builder',
    title: 'UTM Builder – Free UTM Link Generator',
    h1: 'UTM builder',
    description: 'Free UTM builder: add source, medium and campaign to any link, pick common presets, tidy the naming and copy the tracked URL in one tap. No signup.',
    blurb: 'Tag any link with clean UTMs, use presets, build several at once, copy in one tap.',
    feeds: { name: 'Funnels', href: '/pricing' },
    colors: ['#059669', '#0ea5e9'],
    emoji: '🔗',
  },
  {
    slug: 'qr-code-generator',
    name: 'QR code generator',
    title: 'QR Code Generator – Free, No Signup, PNG & SVG',
    h1: 'QR code generator',
    description: 'Free QR code generator for links, text, Wi-Fi, email, phone and contact cards. Pick colors, size and margin, then download PNG or SVG. No signup.',
    blurb: 'Links, Wi-Fi, contacts and more. Custom colors, PNG or SVG, made in your browser.',
    feeds: { name: 'Link-in-bio', href: '/pricing' },
    colors: ['#f59e0b', '#ef4444'],
    emoji: '🔳',
  },
  {
    slug: 'email-signature-generator',
    name: 'Email signature generator',
    title: 'Email Signature Generator – Free for Gmail & Outlook',
    h1: 'Email signature generator',
    description: 'Free email signature generator. Pick a template and color, add your details, logo and social links, then copy it into Gmail, Outlook or Apple Mail. No signup.',
    blurb: 'Five clean templates that paste straight into Gmail, Outlook and Apple Mail.',
    feeds: { name: 'Email list & CRM', href: '/pricing' },
    colors: ['#06b6d4', '#6366f1'],
    emoji: '✍️',
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
