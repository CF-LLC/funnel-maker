import type { ToolDef } from '../types'
export const downloadsTool = {
  id: 'downloads',
  name: 'Digital downloads',
  tagline: 'Sell PDFs, courses and files from your own storefront, paid through your own Stripe, delivered instantly.',
  route: '/digital-downloads',
  nav: [{ label: 'Digital downloads', href: '/digital-downloads', icon: 'download' }],
  accessKey: 'downloads',
  protectedPaths: ['/digital-downloads'],
  priceLabel: '$12/mo or $99/yr, or included in All Access',
  /** Hidden from home, dashboard, pricing and nav until downloads_public (runtime) or NEXT_PUBLIC_DOWNLOADS_ENABLED is on. */
  launchFlag: 'downloads',
  showcase: {
    cardTagline: 'Sell your downloads. Get paid in your own Stripe.',
    rows: ['creators', 'get-paid'],
    colors: { from: '#450a0a', to: '#1c1917', accent: '#f87171' },
    shot: '/shots/downloads.jpg',
    order: 11,
  },
} as const satisfies ToolDef
