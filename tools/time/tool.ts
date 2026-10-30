import type { ToolDef } from '../types'
export const timeTool = {
  id: 'time',
  name: 'Time tracking',
  tagline: 'Track hours by client and project, then turn unbilled time into an invoice.',
  route: '/time',
  nav: [{ label: 'Time', href: '/time', icon: 'time' }],
  accessKey: 'time',
  protectedPaths: ['/time'],
  priceLabel: '$12/mo or $99/yr, or included in All Access',
  /** Hidden from home, dashboard, pricing and nav until timetracking_public (runtime) or NEXT_PUBLIC_TIMETRACKING_ENABLED is on. */
  launchFlag: 'timetracking',
  showcase: {
    cardTagline: 'Every billable hour, on the invoice.',
    rows: ['get-paid', 'everyone'],
    colors: { from: '#064e3b', to: '#0c0a09', accent: '#34d399' },
    shot: '/shots/time.jpg',
    order: 15,
  },
} as const satisfies ToolDef
