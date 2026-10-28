import type { ToolDef } from '../types'
export const emaillistTool = {
  id: 'emaillist',
  name: 'Email list',
  tagline: 'Grow a list of people who asked to hear from you, and send them a beautiful email in a few clicks.',
  route: '/email-list',
  nav: [{ label: 'Email list', href: '/email-list', icon: 'mail' }],
  accessKey: 'emaillist',
  protectedPaths: ['/email-list'],
  priceLabel: '$12/mo or $99/yr, or included in All Access',
  /** Hidden from home, dashboard, pricing and nav until emaillist_public (runtime) or NEXT_PUBLIC_EMAILLIST_ENABLED is on. */
  launchFlag: 'emaillist',
  showcase: {
    cardTagline: 'Grow your list. Send emails people want.',
    rows: ['creators', 'everyone'],
    colors: { from: '#1e1b4b', to: '#0e7490', accent: '#67e8f9' },
    shot: '/shots/emaillist.jpg',
    order: 10,
  },
} as const satisfies ToolDef
