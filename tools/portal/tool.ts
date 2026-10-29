import type { ToolDef } from '../types'
export const portalTool = {
  id: 'portal',
  name: 'Client portal',
  tagline: 'One private link per client with their invoices, proposals, bookings, files and an onboarding checklist.',
  route: '/portal',
  nav: [{ label: 'Client portal', href: '/portal', icon: 'portal' }],
  accessKey: 'portal',
  protectedPaths: ['/portal'],
  priceLabel: '$12/mo or $99/yr, or included in All Access',
  /** Hidden from home, dashboard, pricing and nav until portal_public (runtime) or NEXT_PUBLIC_PORTAL_ENABLED is on. */
  launchFlag: 'portal',
  showcase: {
    cardTagline: 'One private link with everything your client needs.',
    rows: ['coaches', 'everyone'],
    colors: { from: '#082f49', to: '#0c0a09', accent: '#38bdf8' },
    shot: '/shots/portal.jpg',
    order: 12,
  },
} as const satisfies ToolDef
