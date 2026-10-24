import type { ToolDef } from '../types'
export const invoicesTool = {
  id: 'invoices',
  name: 'Invoices',
  tagline: 'Clients, saved items, shareable invoices with PDF and pay links.',
  route: '/invoices',
  nav: [{ label: 'Invoices', href: '/invoices', icon: 'receipt' }],
  accessKey: 'invoices',
  protectedPaths: ['/invoices'],
  priceLabel: '$12/mo on its own, or included in All Access',
} as const satisfies ToolDef
