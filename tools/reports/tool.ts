import type { ToolDef } from '../types'
export const reportsTool = {
  id: 'reports',
  name: 'Report kit',
  tagline: 'Monthly client reports with your numbers, charts and screenshots, on one private link and a PDF.',
  route: '/reports',
  nav: [{ label: 'Reports', href: '/reports', icon: 'reports' }],
  accessKey: 'reports',
  protectedPaths: ['/reports'],
  priceLabel: '$12/mo or $99/yr, or included in All Access',
  /** Hidden from home, dashboard, pricing and nav until reports_public (runtime) or NEXT_PUBLIC_REPORTS_ENABLED is on. */
  launchFlag: 'reports',
  showcase: {
    cardTagline: 'Show clients the work is working.',
    rows: ['get-paid', 'everyone'],
    colors: { from: '#0c4a6e', to: '#020617', accent: '#38bdf8' },
    shot: '/shots/reports.jpg',
    order: 17,
  },
} as const satisfies ToolDef
