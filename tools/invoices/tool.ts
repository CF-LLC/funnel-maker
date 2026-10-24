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
  showcase: {
    cardTagline: 'Bill clients. Get paid. Done.',
    rows: ['get-paid', 'coaches'],
    colors: { from: '#064e3b', to: '#059669', accent: '#34d399' },
    shot: '/shots/invoices.jpg',
    order: 2,
  },
} as const satisfies ToolDef
