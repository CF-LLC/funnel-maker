import type { ToolDef } from '../types'
export const funnelsTool = {
  id: 'funnels',
  name: 'Funnel Maker',
  tagline: 'Build, preview and publish sales funnels from templates.',
  route: '/funnels',
  nav: [
    { label: 'My funnels', href: '/funnels', icon: 'zap' },
    { label: 'Templates', href: '/funnels/templates', icon: 'layout-template' },
  ],
  accessKey: 'funnels',
  protectedPaths: ['/dashboard', '/funnels'],
  priceLabel: 'Funnel Maker plans below',
  showcase: {
    cardTagline: 'Launch a page that sells, in minutes.',
    rows: ['coaches', 'creators'],
    colors: { from: '#7c2d12', to: '#ea580c', accent: '#fb923c' },
    shot: '/shots/funnels.jpg',
    order: 1,
  },
} as const satisfies ToolDef
