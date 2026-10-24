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
} as const satisfies ToolDef
