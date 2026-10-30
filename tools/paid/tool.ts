import type { ToolDef } from '../types'
export const paidTool = {
  id: 'paid',
  name: 'Paid?',
  tagline: 'Drop in a bank CSV and match money in to your open invoices. Your bank file never leaves your browser.',
  route: '/paid',
  nav: [{ label: 'Paid?', href: '/paid', icon: 'paid' }],
  accessKey: 'paid',
  protectedPaths: ['/paid'],
  priceLabel: '$12/mo or $99/yr, or included in All Access',
  /** Hidden from home, dashboard, pricing and nav until paid_public (runtime) or NEXT_PUBLIC_PAID_ENABLED is on. */
  launchFlag: 'paid',
  showcase: {
    cardTagline: 'See which invoices got paid.',
    rows: ['get-paid'],
    colors: { from: '#064e3b', to: '#020617', accent: '#34d399' },
    shot: '/shots/paid.jpg',
    order: 18,
  },
} as const satisfies ToolDef
