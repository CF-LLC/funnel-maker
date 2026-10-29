// Sample data for the demo account and the public demo page (/c/demo). Nothing here is real or stored.
import type { Project, Req } from './core'
import type { ProjectRow } from './load'

const ago = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString()
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
export const DEMO_OWNER = 'Riverside Fitness'
const base = (n: number, title: string, client: string, email: string, rate: number | null, days: number): Project => ({ id: id(n), title, client_name: client, client_email: email, currency: 'USD', hourly_rate_cents: rate, token: 'demo', revoked: false, last_viewed_at: ago(days / 3), view_count: 6, created_at: ago(days), updated_at: ago(1) })
export function demoProjects(): ProjectRow[] {
  return [
    { ...base(1, 'Corporate wellness program', 'Maya Chen', 'maya@example.com', 9500, 21), approved: 91500, pending: 28500, pendingCount: 2, readyCount: 2 },
    { ...base(2, '12-week team challenge', 'Jordan Ellis', 'jordan@example.com', null, 9), approved: 25000, pending: 0, pendingCount: 0, readyCount: 0 },
    { ...base(3, 'Studio launch content', 'Priya Natarajan', 'priya@example.com', 7500, 2), approved: 0, pending: 15000, pendingCount: 1, readyCount: 0 },
  ]
}
export function demoRequests(): Req[] {
  const r = (n: number, title: string, est: Partial<Req>, status: Req['status'], extra: Partial<Req> = {}): Req => ({ id: id(100 + n), project_id: id(1), title, description: null, est_kind: 'hours', hours: null, price_cents: null, status, decided_name: status === 'pending' ? null : 'Maya Chen', decided_note: null, decided_at: status === 'pending' ? null : ago(10 - n), invoice_id: null, invoiced_at: null, created_at: ago(14 - n), ...est, ...extra })
  return [
    r(1, 'Extra Saturday group session', { est_kind: 'price', price_cents: 25000 }, 'approved', { invoice_id: id(900), invoiced_at: ago(6), decided_note: 'Great, the team loved it.' }),
    r(2, 'Nutrition handout for new hires', { hours: 3 }, 'approved', { description: 'Two-page PDF in your brand colours.' }),
    r(3, 'Desk-stretch video series (5 clips)', { hours: 4 }, 'approved'),
    r(4, 'Weekend retreat planning', { est_kind: 'price', price_cents: 120000 }, 'declined', { decided_note: 'Not this quarter, maybe in spring.' }),
    r(5, 'Monthly progress report for HR', { hours: 2 }, 'pending', { description: 'One page per month with attendance and goals hit.' }),
    r(6, 'Add a second weekly class', { hours: 1 }, 'pending'),
  ]
}
