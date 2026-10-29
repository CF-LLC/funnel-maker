// Sample data for the demo account and the public demo portal (/p/demo). Nothing here is real or stored.
import type { Portal, PtFile, Task, Template } from './core'
import type { Item } from './items'
import type { Candidate } from './load'

const ago = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString()
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
export const DEMO_OWNER = 'Riverside Fitness'
export function demoPortals(): (Portal & { done: number; total: number })[] {
  return [
    { id: id(1), client_name: 'Maya Chen', client_email: 'maya@example.com', welcome: 'Welcome to your 12-week strength program! Everything you need is right here.', token: 'demo', revoked: false, last_viewed_at: ago(0.2), view_count: 14, created_at: ago(9), updated_at: ago(1), done: 3, total: 5 },
    { id: id(2), client_name: 'Jordan Ellis', client_email: 'jordan@example.com', welcome: null, token: 'demo', revoked: false, last_viewed_at: ago(3), view_count: 4, created_at: ago(5), updated_at: ago(3), done: 1, total: 5 },
    { id: id(3), client_name: 'Priya Natarajan', client_email: 'priya@example.com', welcome: null, token: 'demo', revoked: false, last_viewed_at: null, view_count: 0, created_at: ago(1), updated_at: ago(1), done: 0, total: 4 },
  ]
}
export function demoTasks(): Task[] {
  const t = (n: number, title: string, who: 'client' | 'owner', done: boolean, extra: Partial<Task> = {}): Task => ({ id: id(100 + n), portal_id: id(1), title, note: null, link: null, who, sort: n, done_at: done ? ago(5 - n) : null, done_by: done ? who : null, ...extra })
  return [
    t(1, 'Fill in the health questionnaire', 'client', true, { note: 'Takes about 5 minutes.' }),
    t(2, 'Book your kickoff assessment', 'client', true),
    t(3, 'Pay the first month', 'client', true),
    t(4, 'Send your training plan', 'owner', false, { note: 'Coach Sam will upload it here before your first session.' }),
    t(5, 'Download the app and log your first workout', 'client', false, { link: 'https://example.com/app' }),
  ]
}
export function demoFiles(): PtFile[] {
  return [
    { id: id(201), portal_id: id(1), name: 'Welcome pack.pdf', size_bytes: 1_840_000, mime: 'application/pdf', download_count: 3, created_at: ago(8) },
    { id: id(202), portal_id: id(1), name: 'Meal guide - week 1.pdf', size_bytes: 920_000, mime: 'application/pdf', download_count: 1, created_at: ago(2) },
  ]
}
export function demoItems(): Item[] {
  return [
    { kind: 'invoice', id: id(301), title: 'Invoice RF-1042', sub: 'Due 2026-11-05', status: 'unpaid', amount: '$249.00', href: null, date: '2026-11-05' },
    { kind: 'proposal', id: id(302), title: '12-week strength program', sub: 'Valid until 2026-11-15', status: 'accepted', amount: null, href: null, date: null },
    { kind: 'booking', id: id(303), title: 'Kickoff assessment', sub: 'Tue, Nov 3, 9:00 AM CST', status: 'confirmed', amount: null, href: null, date: null },
  ]
}
export const demoCandidates = (): Candidate[] => demoItems().map((i) => ({ ...i, email: 'maya@example.com' }))
export const demoTemplates = (): Template[] => [{ id: id(401), name: 'New PT client', items: demoTasks().map((t) => ({ title: t.title, note: t.note, link: t.link, who: t.who })) }]
