import type { ToolDef } from '../types'
export const formsTool = {
  id: 'forms',
  name: 'Forms',
  tagline: 'Simple forms with a public page, CSV export, and funnel embeds.',
  route: '/forms',
  nav: [{ label: 'Forms', href: '/forms', icon: 'clipboard' }],
  accessKey: 'forms',
  protectedPaths: ['/forms'],
  priceLabel: 'Included in All Access',
} as const satisfies ToolDef
