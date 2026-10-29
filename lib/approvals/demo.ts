// Sample data for the demo account and the public demo page (/a/demo). Nothing here is real or stored.
import type { Comment, Version } from './core'
import type { ItemRow } from './load'

const ago = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString()
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
export const DEMO_OWNER = 'Riverside Fitness'
export const DEMO_PREVIEW = '/shots/approvals-demo.svg'
const it = (n: number, title: string, client: string, status: ItemRow['status'], latest: number, comments: number, days: number): ItemRow =>
  ({ id: id(n), title, client_name: client, client_email: null, token: 'demo', revoked: false, last_viewed_at: ago(days / 2), view_count: 3 + n, created_at: ago(days + 5), updated_at: ago(days), status, latest, comments })
export function demoItems(): ItemRow[] {
  return [
    it(1, 'Spring class schedule poster', 'Maya Chen', 'waiting', 3, 3, 0.3),
    it(2, 'Gym logo refresh', 'Jordan Ellis', 'changes', 2, 2, 1),
    it(3, 'Member welcome booklet (PDF)', 'Priya Natarajan', 'approved', 1, 1, 4),
    it(4, 'Promo reel for Instagram', 'Sam Ortiz', 'approved', 2, 0, 7),
  ]
}
export function demoVersions(): Version[] {
  const v = (n: number, status: Version['status'], days: number, extra: Partial<Version> = {}): Version => ({ id: id(200 + n), item_id: id(1), number: n, kind: 'file', name: `spring-poster-v${n}.png`, mime: 'image/png', size_bytes: 840_000 + n * 9000, video_url: null, note: null, status, decided_name: status === 'waiting' ? null : 'Maya Chen', decided_at: status === 'waiting' ? null : ago(days - 0.5), created_at: ago(days), ...extra })
  return [v(3, 'waiting', 0.4, { note: 'Bigger times, new photo, logo moved to the top.' }), v(2, 'changes', 2), v(1, 'changes', 4)]
}
export function demoComments(): Comment[] {
  const c = (n: number, v: number, author: Comment['author'], body: string, days: number): Comment => ({ id: id(300 + n), item_id: id(1), version_id: id(200 + v), author, name: author === 'client' ? 'Maya Chen' : null, body, created_at: ago(days) })
  return [
    c(1, 1, 'client', 'Love the colours. Could the class times be bigger? Hard to read from the door.', 3.8),
    c(2, 2, 'client', 'Better! Can we swap the photo for one of the Saturday group?', 1.8),
    c(3, 3, 'owner', 'New photo is in, and the logo moved up top. Have a look.', 0.4),
  ]
}
