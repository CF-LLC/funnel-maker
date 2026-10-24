import type { ToolDef } from '../types'
export const funnelsTool = {
  id: 'funnels',
  name: 'Funnel Maker',
  tagline: 'Build, preview and publish sales funnels from templates.',
  route: '/dashboard/funnels',
  nav: [
    { label: 'My funnels', href: '/dashboard/funnels', icon: 'zap' },
    { label: 'Templates', href: '/dashboard/templates', icon: 'layout-template' },
  ],
  accessKey: 'funnels',
  protectedPaths: ['/dashboard'],
  priceLabel: 'Funnel Maker plans below',
} as const satisfies ToolDef
