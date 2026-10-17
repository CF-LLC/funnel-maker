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
