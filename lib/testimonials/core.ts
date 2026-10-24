// Testimonials (tool #6). Pure logic shared by the dashboard, public pages, API routes and tests.
import { z } from 'zod'

export const STATUSES = ['pending', 'approved', 'hidden'] as const
export type Status = (typeof STATUSES)[number]
export const STATUS_LABELS: Record<Status, string> = { pending: 'Pending', approved: 'Approved', hidden: 'Hidden' }
export const STATUS_STYLES: Record<Status, string> = { pending: 'bg-amber-100 text-amber-900', approved: 'bg-green-100 text-green-800', hidden: 'bg-muted text-muted-foreground' }
export const LAYOUTS = ['none', 'grid', 'quote'] as const
export type Layout = (typeof LAYOUTS)[number]
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Owner actions. No delete: hide instead. */
export const ACTIONS = { approve: 'approved', hide: 'hidden', unapprove: 'pending', unhide: 'pending' } as const satisfies Record<string, Status>
export function actionsFor(s: Status): (keyof typeof ACTIONS)[] {
  if (s === 'pending') return ['approve', 'hide']
  if (s === 'approved') return ['unapprove', 'hide']
  return ['unhide', 'approve']
}

export const PHOTO_MAX_BYTES = 2 * 1024 * 1024
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const PHOTO_BUCKET = 'tst-photos'

/** Sniff the real image type from magic bytes (never trust the client's Content-Type). */
export function sniffImage(b: Uint8Array): (typeof PHOTO_TYPES)[number] | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'image/png'
  if (b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return 'image/webp'
  return null
}
export const photoExt = (t: string) => (t === 'image/png' ? 'png' : t === 'image/webp' ? 'webp' : 'jpg')

export const submitSchema = z.object({
  handle: z.string().max(40),
  name: z.string().trim().min(1, 'Your name is required').max(100),
  role: z.string().trim().max(100).optional().transform((v) => v || null),
  rating: z.coerce.number().int('Pick a rating from 1 to 5').min(1, 'Pick a rating from 1 to 5').max(5, 'Pick a rating from 1 to 5'),
  body: z.string().trim().min(10, 'Write at least a sentence').max(2000, 'Feedback is too long (2000 max)'),
})

export const settingsSchema = z.object({
  accepting: z.boolean(),
  linkinbio_layout: z.enum(LAYOUTS),
  proposals_layout: z.enum(LAYOUTS),
})

export const reviewFormPath = (handle: string) => `/@${handle}/review`
export const reviewWallPath = (handle: string) => `/@${handle}/reviews`
export const photoSrc = (id: string) => `/api/testimonials/photo/${id}`

/** Funnel embed: "/@handle/reviews" or "/@handle/reviews?layout=quote" (or full saasnation URL) -> iframe src. */
export function testimonialsEmbedSrc(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const m = v.trim().match(/^(?:https:\/\/(?:funnels\.)?saasnation\.site)?\/@([a-z0-9][a-z0-9_-]{2,29})\/reviews\/?(?:\?layout=(grid|quote))?$/i)
  return m ? `/u/${m[1].toLowerCase()}/reviews?embed=1&layout=${(m[2] || 'grid').toLowerCase()}` : undefined
}

export const stars = (n: number) => '★'.repeat(Math.max(0, Math.min(5, n))) + '☆'.repeat(5 - Math.max(0, Math.min(5, n)))
