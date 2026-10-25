import type { ToolDef } from '../types'
export const testimonialsTool = {
  id: 'testimonials',
  name: 'Testimonials',
  tagline: 'Collect reviews at one link, approve them, and show them on funnels, Link-in-bio and proposals.',
  route: '/testimonials',
  nav: [{ label: 'Testimonials', href: '/testimonials', icon: 'star' }],
  accessKey: 'testimonials',
  protectedPaths: ['/testimonials'],
  priceLabel: '$12/mo or $99/yr, or included in All Access',
  showcase: {
    cardTagline: 'Let happy clients sell for you.',
    rows: ['creators', 'coaches'],
    colors: { from: '#713f12', to: '#ca8a04', accent: '#facc15' },
    shot: '/shots/testimonials.jpg',
    order: 6,
  },
} as const satisfies ToolDef
