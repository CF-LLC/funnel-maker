// JSON-LD (schema.org) builders. Prices come from PRICES only, which must match the pricing page and Stripe.
import { SITE_URL } from '@/lib/free-tools/site-url'
import { COMPANY, SITE_NAME } from '@/lib/site'

export const PRICES = { toolMonthly: '12.00', toolYearly: '99.00', allMonthly: '29.00', allYearly: '249.00' } as const
type Ld = Record<string, unknown>

export const abs = (p: string) => `${SITE_URL}${p === '/' ? '' : p}`

export const organizationLd = (): Ld => ({ '@context': 'https://schema.org', '@type': 'Organization', '@id': `${SITE_URL}/#org`, name: SITE_NAME, legalName: COMPANY, url: SITE_URL, logo: `${SITE_URL}/og-logo.png`, address: { '@type': 'PostalAddress', addressRegion: 'AR', addressCountry: 'US' } })
export const websiteLd = (): Ld => ({ '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: SITE_NAME, url: SITE_URL, publisher: { '@id': `${SITE_URL}/#org` } })

const offer = (name: string, price: string, unit: 'MON' | 'ANN'): Ld => ({ '@type': 'Offer', name, price, priceCurrency: 'USD', url: abs('/pricing'), availability: 'https://schema.org/InStock', priceSpecification: { '@type': 'UnitPriceSpecification', price, priceCurrency: 'USD', billingDuration: 1, unitCode: unit } })

/** One SaaS Nation tool with its real single-tool prices. includedOnly: not sold separately (Link-in-bio) -> no Offer. */
export function softwareAppLd(o: { name: string; description: string; path: string; includedOnly?: boolean }): Ld {
  const ld: Ld = { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: o.name, description: o.description, url: abs(o.path), applicationCategory: 'BusinessApplication', operatingSystem: 'Web', publisher: { '@id': `${SITE_URL}/#org` } }
  if (!o.includedOnly) ld.offers = [offer(`${o.name} monthly`, PRICES.toolMonthly, 'MON'), offer(`${o.name} yearly`, PRICES.toolYearly, 'ANN')]
  return ld
}

/** Pricing page: single tool and All Access, monthly and yearly. */
export const pricingLd = (description: string): Ld => ({
  '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: SITE_NAME, description, url: abs('/pricing'), applicationCategory: 'BusinessApplication', operatingSystem: 'Web', publisher: { '@id': `${SITE_URL}/#org` },
  offers: [offer('One tool, monthly', PRICES.toolMonthly, 'MON'), offer('One tool, yearly', PRICES.toolYearly, 'ANN'), offer('All Access, monthly', PRICES.allMonthly, 'MON'), offer('All Access, yearly', PRICES.allYearly, 'ANN')],
})

export const breadcrumbLd = (items: { name: string; path: string }[]): Ld => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path) })) })

/** Safe for <script type="application/ld+json">. */
export const ldHtml = (ld: Ld | Ld[]) => JSON.stringify(ld).replace(/</g, '\\u003c')
