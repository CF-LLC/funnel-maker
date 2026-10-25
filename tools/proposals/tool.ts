import type { ToolDef } from '../types'
export const proposalsTool = {
  id: 'proposals',
  name: 'Proposals',
  tagline: 'Proposals with line items, a public accept page, and one-click invoices.',
  route: '/proposals',
  nav: [{ label: 'Proposals', href: '/proposals', icon: 'file-check' }],
  accessKey: 'proposals',
  protectedPaths: ['/proposals'],
  priceLabel: '$12/mo or $99/yr, or included in All Access',
  showcase: {
    cardTagline: 'Send a quote, get a yes, get paid.',
    rows: ['get-paid', 'coaches'],
    colors: { from: '#0c4a6e', to: '#0891b2', accent: '#22d3ee' },
    shot: '/shots/proposals.jpg',
    order: 5,
  },
} as const satisfies ToolDef
