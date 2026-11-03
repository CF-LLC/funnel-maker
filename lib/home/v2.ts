// Job-based homepage (rework PR 6). Copy from /workspace/saas-nation/homepage-rework.md with Product Lead's changes.
// Gated by the GLOBAL runtime flag `homepage_v2` (public.feature_flags, default off) or the preview param `/?hp=2`.
import { landingPath } from '@/lib/landing/registry'
import { ALL_ACCESS_PRICE, TOOL_PRICE } from '@/lib/plans'

export const HOMEPAGE_V2_FLAG = 'homepage_v2'
export const HOMEPAGE_V2_PREVIEW_PATH = '/home-v2'

/** Middleware rule: only `/` with `hp=2` is rewritten to the noindex preview route. */
export const isHomepageV2Preview = (pathname: string, hp: string | null) => pathname === '/' && hp === '2'

/** Flag row -> on. Global only: allow_users is ignored (signed-out visitors have no user id). */
export const homepageV2On = (row: { enabled?: boolean | null } | null | undefined) => row?.enabled === true

type Item = { name: string; tool: string; href?: string; flag?: string }
export type Job = { id: string; title: string; benefit: string; items: Item[]; cta: string; href: string }

// Tool chips map plain names to real tools; `flag` = launch flag (hidden if that tool is not live).
export const JOBS: Job[] = [
  { id: 'get_clients', title: 'Get clients', benefit: 'Turn visitors into booked calls and leads.', cta: 'Get more clients', href: '/auth/register', items: [
    { name: 'Sales page maker', tool: 'funnels' }, { name: 'Bio link page', tool: 'linkinbio', href: landingPath('link-in-bio') },
    { name: 'Intake form', tool: 'forms', href: landingPath('intake-form-for-coaching-clients') }, { name: 'Booking page', tool: 'booking', href: landingPath('booking-page-without-calendly') },
    { name: 'Email list', tool: 'emaillist', flag: 'emaillist', href: landingPath('email-list') }, { name: 'Review collector', tool: 'testimonials' }] },
  { id: 'win_work', title: 'Win work', benefit: 'Send a quote they can accept online, then keep every client on one Clients page.', cta: 'Send a quote', href: '/auth/register', items: [
    { name: 'Quote maker', tool: 'proposals' }, { name: 'Clients', tool: 'crm', flag: 'crm', href: landingPath('client-list') }, { name: 'Client portal', tool: 'portal', flag: 'portal', href: landingPath('client-portal') }] },
  { id: 'deliver', title: 'Deliver', benefit: 'Get a clear yes on drafts and get paid for extras.', cta: 'Share work for sign-off', href: '/auth/register', items: [
    { name: 'Client portal', tool: 'portal', flag: 'portal', href: landingPath('client-portal') }, { name: 'Download store', tool: 'downloads', flag: 'downloads', href: landingPath('sell-digital-downloads-with-stripe') },
    { name: 'Sign-off link', tool: 'approvals', flag: 'approvals' }, { name: 'Extras tracker', tool: 'changelog', flag: 'changelog' }] },
  { id: 'get_paid', title: 'Get paid', benefit: 'Bill the job, bill your hours and costs, see who paid.', cta: 'Send an invoice', href: '/auth/register', items: [
    { name: 'Invoice maker', tool: 'invoices', href: landingPath('simple-invoice-tool-for-coaches') }, { name: 'Payment checker', tool: 'paid', flag: 'paid' },
    { name: 'Time tracker', tool: 'time', flag: 'timetracking' }, { name: 'Expense tracker', tool: 'expenses', flag: 'expenses' }, { name: 'Client report', tool: 'reports', flag: 'reports' }] },
]

export const jobsFor = (flags: Record<string, boolean>): Job[] => JOBS.map((j) => ({ ...j, items: j.items.filter((i) => !i.flag || flags[i.flag]) }))

export const HERO = {
  title: 'Run your client work in one place.',
  text: 'Get clients, win the work, deliver it and get paid, with every step tied to the same client. Start with one job. The next step is one click away.',
}

export const FITS = [
  'Quote accepted → invoice in one click.',
  'Approved extras → invoice lines.',
  'Unbilled hours and billable costs → an invoice.',
  'Bank CSV → invoices marked paid.',
  'Every form, booking, proposal and invoice → one Clients page.',
]

export const pricingLine = (trial: boolean) => ({
  head: `All Access: ${ALL_ACCESS_PRICE.monthly}/mo or ${ALL_ACCESS_PRICE.yearly}/yr. Every tool, plus each new one.`,
  body: `Or any single tool for ${TOOL_PRICE.monthly}/mo or ${TOOL_PRICE.yearly}/yr.${trial ? " Monthly plans start with a 7-day free trial (card required, cancel before day 7 and you're not charged)." : ''} 14-day money-back guarantee. No free plan.`,
})

export const faqs = (trial: boolean): [string, string][] => [
  ['Is there a free plan?', `No. Six free tools need no signup.${trial ? ' Paid monthly plans start with a 7-day free trial.' : ''}`],
  ['Do I have to buy everything?', `No. Pick one tool for ${TOOL_PRICE.monthly}/mo, or get All Access for ${ALL_ACCESS_PRICE.monthly}/mo if you use three or more.`],
  ['How do clients use it?', 'They open a private link, with no account needed. See the demos: client portal, extras tracker and sign-off link.'],
  ['How do I get paid?', 'Invoices use your own Stripe Payment Link, so the money goes to your Stripe account.'],
]

export const DEMOS: [string, string, string][] = [['p', 'Client portal demo', '/p/demo'], ['c', 'Extras tracker demo', '/c/demo'], ['a', 'Sign-off link demo', '/a/demo']]

export const FINAL = { title: "Pick your first job. We'll show you the next one." }

/** Event names exactly as in homepage-rework.md §4 (the ones that fire on the homepage). */
export const HOME_EVENTS = ['home_view', 'job_card_click', 'hero_trial_click', 'hero_free_tool_click', 'demo_view', 'faq_open'] as const
