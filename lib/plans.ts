// funnel-maker pricing. Checkout uses Stripe Payment Links on Cooper's CF LLC Stripe account,
// configured via env. No Stripe API calls, no webhooks: an admin marks accounts paid in /dashboard/admin/approvals.

export type PlanId = 'monthly' | 'yearly' | 'founding'

export type Plan = {
  id: PlanId
  name: string
  price: string
  period: string
  note: string
  link: string | undefined
}

export const PLANS: Plan[] = [
  { id: 'monthly', name: 'Monthly', price: '$12', period: '/month', note: 'Cancel anytime', link: process.env.NEXT_PUBLIC_STRIPE_LINK_MONTHLY },
  { id: 'yearly', name: 'Yearly', price: '$99', period: '/year', note: 'About $8.25/month, 2+ months free', link: process.env.NEXT_PUBLIC_STRIPE_LINK_YEARLY },
  { id: 'founding', name: 'Founding member', price: '$79', period: 'first year', note: 'First 10 users. Includes a 15-minute feedback call. Renews at $99/yr.', link: process.env.NEXT_PUBLIC_STRIPE_LINK_FOUNDING },
]

export const PLAN_FEATURES = [
  'All 3 templates: Book a call, Sales page, Free download',
  'Up to 3 live funnels',
  'Lead storage + CSV export',
  'Uses your own Calendly / Cal.com and Stripe Payment Links',
  'Email support',
]

/** Only real Stripe Payment Links are used; anything else counts as "not set yet". */
export function checkoutUrl(plan: Plan, user?: { id: string; email?: string | null }): string | null {
  if (!plan.link) return null
  let url: URL
  try { url = new URL(plan.link) } catch { return null }
  if (url.protocol !== 'https:' || url.hostname !== 'buy.stripe.com') return null
  if (user) {
    url.searchParams.set('client_reference_id', user.id)
    if (user.email) url.searchParams.set('prefilled_email', user.email)
  }
  return url.toString()
}

// SaaS Nation pricing (locked Oct 24, 2026): each tool $12/mo or $99/yr; All Access $29/mo or $249/yr.
// NEXT_PUBLIC_* must be referenced literally so Next inlines them at build time.
export type Billing = 'monthly' | 'yearly'
export type SoldKey = 'funnels' | 'invoices' | 'forms' | 'proposals' | 'testimonials' | 'booking' | 'dataremoval' | 'crm' | 'emaillist' | 'downloads' | 'portal' | 'approvals' | 'changelog' | 'time' | 'expenses' | 'reports' | 'all'
export const TOOL_PRICE = { monthly: '$12', yearly: '$99' } as const
export const ALL_ACCESS_PRICE = { monthly: '$29', yearly: '$249' } as const
export const PAYMENT_LINKS: Record<SoldKey, Record<Billing, string | undefined>> = {
  funnels: { monthly: process.env.NEXT_PUBLIC_STRIPE_LINK_MONTHLY, yearly: process.env.NEXT_PUBLIC_STRIPE_LINK_YEARLY },
  invoices: { monthly: process.env.NEXT_PUBLIC_STRIPE_LINK_INVOICES_MONTHLY, yearly: process.env.NEXT_PUBLIC_STRIPE_LINK_INVOICES_YEARLY },
  forms: { monthly: process.env.NEXT_PUBLIC_STRIPE_LINK_FORMS_MONTHLY, yearly: process.env.NEXT_PUBLIC_STRIPE_LINK_FORMS_YEARLY },
  proposals: { monthly: process.env.NEXT_PUBLIC_STRIPE_LINK_PROPOSALS_MONTHLY, yearly: process.env.NEXT_PUBLIC_STRIPE_LINK_PROPOSALS_YEARLY },
  testimonials: { monthly: process.env.NEXT_PUBLIC_STRIPE_LINK_TESTIMONIALS_MONTHLY, yearly: process.env.NEXT_PUBLIC_STRIPE_LINK_TESTIMONIALS_YEARLY },
  booking: { monthly: process.env.NEXT_PUBLIC_STRIPE_LINK_BOOKING_MONTHLY, yearly: process.env.NEXT_PUBLIC_STRIPE_LINK_BOOKING_YEARLY },
  dataremoval: { monthly: process.env.NEXT_PUBLIC_STRIPE_LINK_DATAREMOVAL_MONTHLY, yearly: process.env.NEXT_PUBLIC_STRIPE_LINK_DATAREMOVAL_YEARLY },
  crm: { monthly: process.env.NEXT_PUBLIC_STRIPE_LINK_CRM_MONTHLY, yearly: process.env.NEXT_PUBLIC_STRIPE_LINK_CRM_YEARLY },
  emaillist: { monthly: process.env.NEXT_PUBLIC_STRIPE_LINK_EMAILLIST_MONTHLY, yearly: process.env.NEXT_PUBLIC_STRIPE_LINK_EMAILLIST_YEARLY },
  downloads: { monthly: process.env.NEXT_PUBLIC_STRIPE_LINK_DOWNLOADS_MONTHLY, yearly: process.env.NEXT_PUBLIC_STRIPE_LINK_DOWNLOADS_YEARLY },
  portal: { monthly: process.env.NEXT_PUBLIC_STRIPE_LINK_PORTAL_MONTHLY, yearly: process.env.NEXT_PUBLIC_STRIPE_LINK_PORTAL_YEARLY },
  changelog: { monthly: process.env.NEXT_PUBLIC_STRIPE_LINK_CHANGELOG_MONTHLY, yearly: process.env.NEXT_PUBLIC_STRIPE_LINK_CHANGELOG_YEARLY },
  time: { monthly: process.env.NEXT_PUBLIC_STRIPE_LINK_TIME_MONTHLY, yearly: process.env.NEXT_PUBLIC_STRIPE_LINK_TIME_YEARLY },
  expenses: { monthly: process.env.NEXT_PUBLIC_STRIPE_LINK_EXPENSES_MONTHLY, yearly: process.env.NEXT_PUBLIC_STRIPE_LINK_EXPENSES_YEARLY },
  reports: { monthly: process.env.NEXT_PUBLIC_STRIPE_LINK_REPORTS_MONTHLY, yearly: process.env.NEXT_PUBLIC_STRIPE_LINK_REPORTS_YEARLY },
  approvals: { monthly: process.env.NEXT_PUBLIC_STRIPE_LINK_APPROVALS_MONTHLY, yearly: process.env.NEXT_PUBLIC_STRIPE_LINK_APPROVALS_YEARLY },
  all: { monthly: process.env.NEXT_PUBLIC_STRIPE_LINK_ALL_MONTHLY, yearly: process.env.NEXT_PUBLIC_STRIPE_LINK_ALL_YEARLY },
}
export function paymentLinkUrl(key: SoldKey, billing: Billing, user?: { id: string; email?: string | null }): string | null {
  return checkoutUrl({ id: 'monthly', name: '', price: '', period: '', note: '', link: PAYMENT_LINKS[key][billing] }, user)
}
