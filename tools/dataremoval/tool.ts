import type { ToolDef } from '../types'
export const dataremovalTool = {
  id: 'dataremoval',
  name: 'Data Removal',
  tagline: 'A guided checklist for opting out of people-search sites, with direct links and 60-day re-check reminders.',
  route: '/data-removal/tracker',
  nav: [{ label: 'Data Removal', href: '/data-removal/tracker', icon: 'shield' }],
  accessKey: 'dataremoval',
  protectedPaths: ['/data-removal/tracker'],
  priceLabel: '$12/mo or $99/yr, or included in All Access',
  showcase: {
    cardTagline: 'Find and opt out of people-search sites, step by step.',
    rows: ['everyone'],
    colors: { from: '#1e1b4b', to: '#4338ca', accent: '#a5b4fc' },
    shot: '/shots/forms.jpg',
    order: 8,
  },
} as const satisfies ToolDef
