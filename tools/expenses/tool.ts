import type { ToolDef } from '../types'
export const expensesTool = {
  id: 'expenses',
  name: 'Expenses',
  tagline: 'Log business expenses with receipts, see where the money goes, and bill clients for what they owe.',
  route: '/expenses',
  nav: [{ label: 'Expenses', href: '/expenses', icon: 'expenses' }],
  accessKey: 'expenses',
  protectedPaths: ['/expenses'],
  priceLabel: '$12/mo or $99/yr, or included in All Access',
  /** Hidden from home, dashboard, pricing and nav until expenses_public (runtime) or NEXT_PUBLIC_EXPENSES_ENABLED is on. */
  launchFlag: 'expenses',
  showcase: {
    cardTagline: 'Every receipt, kept. Every billable cost, billed.',
    rows: ['get-paid', 'everyone'],
    colors: { from: '#422006', to: '#0c0a09', accent: '#fbbf24' },
    shot: '/shots/expenses.jpg',
    order: 16,
  },
} as const satisfies ToolDef
