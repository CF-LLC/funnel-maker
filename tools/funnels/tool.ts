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
} as const satisfies ToolDef
