// Pure helpers for the first-party acquisition funnel (no I/O, easy to test).
import { FREE_TOOLS } from '@/lib/free-tools/registry'

export const VISITOR_COOKIE = 'sn_vid'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const isVisitorId = (v: unknown): v is string => typeof v === 'string' && UUID.test(v)

const clip = (v: unknown, n: number): string | null => {
  if (typeof v !== 'string') return null
  const s = v.trim().toLowerCase().replace(/[^\w.\-+ /:]/g, '').slice(0, n)
  return s || null
}

/** Free tool slug for a path like /free-tools/qr-code-generator, else null. */
export function freeToolFromPath(path: string): string | null {
  const m = /^\/free-tools\/([a-z0-9-]+)\/?$/.exec(path)
  return m && FREE_TOOLS.some((t) => t.slug === m[1]) ? m[1] : null
}

/** "Made with SaaS Nation" footer tags on client-facing pages (?ref=<tool>). Anything else is dropped. */
export const REFS = ['approvals', 'changelog', 'portal', 'proposals', 'invoices', 'booking'] as const
export type Ref = (typeof REFS)[number]
export const cleanRef = (v: unknown): Ref | null => (typeof v === 'string' && (REFS as readonly string[]).includes(v) ? (v as Ref) : null)
export const madeWithHref = (ref: Ref, site = 'https://saasnation.site') => `${site}/?ref=${ref}`

export type TrackInput = { visitorId: string; path: string; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; ref: Ref | null; cta: boolean }

/** Validate a beacon body. Returns null when it is not worth storing. */
export function parseTrack(body: any, cookieVid: string | undefined): TrackInput | null {
  const visitorId = isVisitorId(cookieVid) ? cookieVid : isVisitorId(body?.vid) ? body.vid : null
  const path = typeof body?.path === 'string' && body.path.startsWith('/') ? body.path.split('?')[0].slice(0, 200) : null
  if (!visitorId || !path) return null
  return { visitorId, path, utm_source: clip(body?.utm_source, 100), utm_medium: clip(body?.utm_medium, 100), utm_campaign: clip(body?.utm_campaign, 100), ref: cleanRef(body?.ref), cta: body?.kind === 'cta' }
}

export type Ev = { ref?: string | null; visitor_id: string; kind: 'visit' | 'free_tool' | 'signup' | 'cta'; free_tool: string | null; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; user_id: string | null }

export type FunnelRow = { key: string; visitors: number; freeToolUsers: number; signups: number; paying: number }
export type RefRow = { key: string; visitors: number; ctaClicks: number; ctaVisitors: number; signups: number; paying: number }

/**
 * Build funnel rows from events. A visitor is attributed to the first UTM source (or "direct") and every free tool they opened.
 * Paying = signed-up user with a paid seat (paidUserIds).
 */
export function buildFunnel(events: Ev[], paidUserIds: Set<string>) {
  const byV = new Map<string, { source: string; tools: Set<string>; user: string | null; ref: string; cta: number }>()
  for (const e of events) {
    const v = byV.get(e.visitor_id) ?? { source: '', tools: new Set<string>(), user: null, ref: '', cta: 0 }
    if (!v.ref && e.ref) v.ref = e.ref
    if (e.kind === 'cta') v.cta++
    if (!v.source && e.utm_source) v.source = [e.utm_source, e.utm_medium].filter(Boolean).join(' / ')
    if (e.kind === 'free_tool' && e.free_tool) v.tools.add(e.free_tool)
    if (e.kind === 'signup' && e.user_id) v.user = e.user_id
    byV.set(e.visitor_id, v)
  }
  const bump = (m: Map<string, FunnelRow>, key: string, v: { tools: Set<string>; user: string | null }) => {
    const r = m.get(key) ?? { key, visitors: 0, freeToolUsers: 0, signups: 0, paying: 0 }
    r.visitors++
    if (v.tools.size) r.freeToolUsers++
    if (v.user) { r.signups++; if (paidUserIds.has(v.user)) r.paying++ }
    m.set(key, r)
  }
  const bySource = new Map<string, FunnelRow>()
  const byTool = new Map<string, FunnelRow>()
  const total: FunnelRow = { key: 'All visitors', visitors: 0, freeToolUsers: 0, signups: 0, paying: 0 }
  for (const v of byV.values()) {
    bump(bySource, v.source || 'direct / none', v)
    for (const t of v.tools) bump(byTool, t, v)
    total.visitors++
    if (v.tools.size) total.freeToolUsers++
    if (v.user) { total.signups++; if (paidUserIds.has(v.user)) total.paying++ }
  }
  const sort = <T extends { visitors: number }>(m: Map<string, T>) => [...m.values()].sort((a, b) => b.visitors - a.visitors)
  // By "Made with SaaS Nation" ref: visitors first tagged with that ref, their CTA clicks, and their signups / paid seats.
  const byRef = new Map<string, RefRow>()
  for (const v of byV.values()) {
    if (!v.ref) continue
    const r = byRef.get(v.ref) ?? { key: v.ref, visitors: 0, ctaClicks: 0, ctaVisitors: 0, signups: 0, paying: 0 }
    r.visitors++; r.ctaClicks += v.cta; if (v.cta) r.ctaVisitors++
    if (v.user) { r.signups++; if (paidUserIds.has(v.user)) r.paying++ }
    byRef.set(v.ref, r)
  }
  return { total, bySource: sort(bySource), byTool: sort(byTool), byRef: sort(byRef) }
}
