import { z } from 'zod'
import { safeHttpsUrl } from '@/lib/url-safety'

export const HANDLE_RE = /^[a-z0-9][a-z0-9_-]{2,29}$/
export const normalizeHandle = (h: string) => h.trim().toLowerCase().replace(/^@/, '')
const https = (max: number) => z.string().trim().max(max).refine((v) => !!safeHttpsUrl(v), 'Must be an https link')

export const THEMES = ['light', 'dark', 'brand'] as const
export type Theme = (typeof THEMES)[number]
export const MAX_LINKS = 12
export const SOCIALS = ['instagram', 'x', 'youtube', 'tiktok', 'linkedin', 'github', 'facebook'] as const
export type Social = (typeof SOCIALS)[number]
export const socialsSchema = z.record(z.string(), z.string()).transform((o, ctx) => {
  const out: Partial<Record<Social, string>> = {}
  for (const [k, v] of Object.entries(o)) {
    if (!v.trim()) continue
    if (!(SOCIALS as readonly string[]).includes(k)) continue
    const u = safeHttpsUrl(v.trim())
    if (!u || u.length > 300) { ctx.addIssue({ code: 'custom', message: `${k}: must be an https link` }); return z.NEVER }
    out[k as Social] = u
  }
  return out
})
/** Badge shows unless the owner has active All Access AND chose to hide it. */
export const showBadge = (hideBadge: boolean, hasAllAccess: boolean) => !(hideBadge && hasAllAccess)
export const publicPath = (handle: string) => `/@${handle}`
export const profileSchema = z.object({
  handle: z.string().transform(normalizeHandle).refine((h) => HANDLE_RE.test(h), '3-30 chars: a-z, 0-9, _ or -'),
  display_name: z.string().trim().max(60),
  bio: z.string().trim().max(160),
  avatar_url: z.union([z.literal(''), https(500)]).transform((v) => v || null),
  show_funnels: z.boolean(),
  published: z.boolean(),
  theme: z.enum(THEMES),
  socials: socialsSchema,
  hide_badge: z.boolean(),
})
export const linkSchema = z.object({ title: z.string().trim().min(1).max(80), url: https(1000) })

export type PublicLink = { id: string; title: string; url: string; position: number }
export const orderLinks = <T extends { position: number; created_at?: string }>(l: T[]) =>
  [...l].sort((a, b) => a.position - b.position || String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')))
export const clickHref = (handle: string, linkId: string) => `/u/${encodeURIComponent(handle)}/l/${encodeURIComponent(linkId)}`
