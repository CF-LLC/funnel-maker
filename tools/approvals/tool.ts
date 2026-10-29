import type { ToolDef } from '../types'
export const approvalsTool = {
  id: 'approvals',
  name: 'Approval link',
  tagline: 'Send one private link, get comments and a clear Approve or Request changes on each version.',
  route: '/approvals',
  nav: [{ label: 'Approval link', href: '/approvals', icon: 'approvals' }],
  accessKey: 'approvals',
  protectedPaths: ['/approvals'],
  priceLabel: '$12/mo or $99/yr, or included in All Access',
  /** Hidden from home, dashboard, pricing and nav until approvals_public (runtime) or NEXT_PUBLIC_APPROVALS_ENABLED is on. */
  launchFlag: 'approvals',
  showcase: {
    cardTagline: 'Get a clear yes on your work.',
    rows: ['coaches', 'everyone'],
    colors: { from: '#064e3b', to: '#0c0a09', accent: '#34d399' },
    shot: '/shots/approvals.jpg',
    order: 14,
  },
} as const satisfies ToolDef
