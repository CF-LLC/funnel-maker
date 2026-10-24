import type { ToolDef } from '../types'
export const linkinbioTool = {
  id: 'linkinbio',
  name: 'Link-in-bio',
  tagline: 'One public page with your links and published funnels, with click counts.',
  route: '/links',
  nav: [{ label: 'Link-in-bio', href: '/links', icon: 'link' }],
  accessKey: 'linkinbio',
  protectedPaths: ['/links'],
  priceLabel: 'Included with every paid plan',
  includedWithAnyPlan: true,
  showcase: {
    cardTagline: 'One link for everything you sell.',
    rows: ['creators'],
    colors: { from: '#1e3a8a', to: '#2563eb', accent: '#60a5fa' },
    shot: '/shots/linkinbio.jpg',
    order: 3,
  },
} as const satisfies ToolDef
