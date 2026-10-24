import type { ToolDef } from '../types'
export const proposalsTool = {
  id: 'proposals',
  name: 'Proposals',
  tagline: 'Proposals with line items, a public accept page, and one-click invoices.',
  route: '/proposals',
  nav: [{ label: 'Proposals', href: '/proposals', icon: 'file-check' }],
  accessKey: 'proposals',
  protectedPaths: ['/proposals'],
  priceLabel: '$12/mo on its own, or included in All Access',
} as const satisfies ToolDef
