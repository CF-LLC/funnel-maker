import type { ToolDef } from '../types'
export const testimonialsTool = {
  id: 'testimonials',
  name: 'Testimonials',
  tagline: 'Collect reviews at one link, approve them, and show them on funnels, Link-in-bio and proposals.',
  route: '/testimonials',
  nav: [{ label: 'Testimonials', href: '/testimonials', icon: 'star' }],
  accessKey: 'testimonials',
  protectedPaths: ['/testimonials'],
  priceLabel: '$12/mo on its own, or included in All Access',
} as const satisfies ToolDef
