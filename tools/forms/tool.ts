import type { ToolDef } from '../types'
export const formsTool = {
  id: 'forms',
  name: 'Forms',
  tagline: 'Simple forms with a public page, CSV export, and funnel embeds.',
  route: '/forms',
  nav: [{ label: 'Forms', href: '/forms', icon: 'clipboard' }],
  accessKey: 'forms',
  protectedPaths: ['/forms'],
  priceLabel: '$12/mo or $99/yr, or included in All Access',
  showcase: {
    cardTagline: 'Know your client before the first call.',
    rows: ['coaches'],
    colors: { from: '#4c1d95', to: '#7c3aed', accent: '#a78bfa' },
    shot: '/shots/forms.jpg',
    order: 4,
  },
} as const satisfies ToolDef
