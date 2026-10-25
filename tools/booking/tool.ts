import type { ToolDef } from '../types'
export const bookingTool = {
  id: 'booking',
  name: 'Booking',
  tagline: 'Your own booking page: weekly hours, meeting types, no double bookings, .ics invites.',
  route: '/booking',
  nav: [{ label: 'Booking', href: '/booking', icon: 'calendar' }],
  accessKey: 'booking',
  protectedPaths: ['/booking'],
  priceLabel: '$12/mo or $99/yr, or included in All Access',
  showcase: {
    cardTagline: 'Let clients pick a time without the back-and-forth.',
    rows: ['coaches'],
    colors: { from: '#064e3b', to: '#0d9488', accent: '#5eead4' },
    shot: '/shots/forms.jpg',
    order: 7,
  },
} as const satisfies ToolDef
