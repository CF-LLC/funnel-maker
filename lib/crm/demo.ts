// Sample data shown to the demo account. Nothing is stored.
import { aggregate, type Activity, type OwnContact } from './core'
const d = (daysAgo: number) => new Date(Date.UTC(2026, 9, 26) - daysAgo * 864e5).toISOString()
export const DEMO_ACTIVITIES: Activity[] = [
  { source: 'form', id: 'd1', email: 'maya.lopez@example.com', name: 'Maya Lopez', phone: '+1 512 555 0142', at: d(21), title: 'Form · Coaching intake', href: '/forms' },
  { source: 'booking', id: 'd2', email: 'maya.lopez@example.com', name: 'Maya Lopez', at: d(18), title: 'Booking', href: '/booking' },
  { source: 'proposal', id: 'd3', email: 'maya.lopez@example.com', name: 'Maya Lopez', at: d(12), title: 'Proposal · 3-month coaching (accepted)', href: '/proposals' },
  { source: 'invoice', id: 'd4', email: 'maya.lopez@example.com', name: 'Maya Lopez', at: d(10), title: 'Invoice INV-0012 (paid)', href: '/invoices', amountCents: 150000, currency: 'USD', paid: true },
  { source: 'invoice', id: 'd5', email: 'maya.lopez@example.com', name: 'Maya Lopez', at: d(2), title: 'Invoice INV-0015 (unpaid)', href: '/invoices', amountCents: 150000, currency: 'USD', paid: false },
  { source: 'booking', id: 'd6', email: 'jordan@brightpixel.studio', name: 'Jordan Reed', at: d(4), title: 'Booking', href: '/booking' },
  { source: 'form', id: 'd7', email: 'jordan@brightpixel.studio', name: 'Jordan Reed', at: d(5), title: 'Funnel lead · Free audit', href: '/funnels' },
  { source: 'form', id: 'd8', email: 'sam.k@example.org', name: 'Sam Kim', at: d(1), title: 'Form · Project inquiry', href: '/forms' },
  { source: 'proposal', id: 'd9', email: 'priya@northwind.co', name: 'Priya Shah', at: d(30), title: 'Proposal · Website refresh (declined)', href: '/proposals' },
  { source: 'invoice', id: 'd10', email: 'li.wei@example.net', name: 'Li Wei', at: d(90), title: 'Invoice INV-0004 (paid)', href: '/invoices', amountCents: 80000, currency: 'USD', paid: true },
]
export const DEMO_OWN: OwnContact[] = [
  { email: 'maya.lopez@example.com', company: 'Lopez Wellness', status: 'active', tags: ['vip', 'coaching'], follow_up_on: '2026-10-28' },
  { email: 'jordan@brightpixel.studio', company: 'Bright Pixel', status: 'lead', tags: ['agency'], follow_up_on: '2026-10-24' },
  { email: 'priya@northwind.co', company: 'Northwind', status: 'not_a_fit', tags: [] },
  { email: 'li.wei@example.net', status: 'past', tags: ['referral'] },
]
export const demoContacts = () => aggregate(DEMO_ACTIVITIES, DEMO_OWN)
export const DEMO_NOTES = [{ id: 'n1', body: 'Wants to add a group program in Q1. Send pricing after the next session.', created_at: d(3), updated_at: d(3) }]
