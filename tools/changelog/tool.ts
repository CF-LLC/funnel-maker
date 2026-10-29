import type { ToolDef } from '../types'
export const changelogTool = {
  id: 'changelog',
  name: 'Change log',
  tagline: 'Log extra client requests, get a clear OK or no on each, and bill the approved extras.',
  route: '/change-log',
  nav: [{ label: 'Change log', href: '/change-log', icon: 'changelog' }],
  accessKey: 'changelog',
  protectedPaths: ['/change-log'],
  priceLabel: '$12/mo or $99/yr, or included in All Access',
  /** Hidden from home, dashboard, pricing and nav until changelog_public (runtime) or NEXT_PUBLIC_CHANGELOG_ENABLED is on. */
  launchFlag: 'changelog',
  showcase: {
    cardTagline: 'Get paid for the extras, not just the plan.',
    rows: ['coaches', 'everyone'],
    colors: { from: '#3b0764', to: '#0c0a09', accent: '#c084fc' },
    shot: '/shots/changelog.jpg',
    order: 13,
  },
} as const satisfies ToolDef
