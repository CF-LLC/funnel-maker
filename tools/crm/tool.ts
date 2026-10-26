import type { ToolDef } from '../types'
export const crmTool = {
  id: 'crm',
  name: 'Client list',
  tagline: 'Everyone who filled a form, booked a call, got a proposal or paid an invoice, in one list with notes and follow-ups.',
  route: '/crm',
  nav: [{ label: 'Client list', href: '/crm', icon: 'users' }],
  accessKey: 'crm',
  protectedPaths: ['/crm'],
  priceLabel: '$12/mo or $99/yr, or included in All Access',
  /** Hidden from home, dashboard, pricing and nav until NEXT_PUBLIC_CRM_ENABLED is on (pricing awaits Cooper's OK). */
  launchFlag: 'crm',
  showcase: {
    cardTagline: 'Every client from every tool, in one list.',
    rows: ['everyone'],
    colors: { from: '#0f172a', to: '#be123c', accent: '#fda4af' },
    shot: '/shots/forms.jpg',
    order: 9,
  },
} as const satisfies ToolDef
