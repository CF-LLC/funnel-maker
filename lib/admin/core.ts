// Admin dashboard: pure helpers (no I/O) so they are easy to test.

export type AccessRow = { user_id: string; tool: string; plan: string | null; source: string; active: boolean }
export type AdminUser = {
  id: string
  email: string
  createdAt: string
  lastSignInAt: string | null
  bannedUntil: string | null
  approved: boolean
  demo: boolean
  tools: string[]
}
export type UserStatus = 'active' | 'pending' | 'suspended' | 'demo'

/** List prices in cents, matching lib/plans.ts (TOOL_PRICE, ALL_ACCESS_PRICE). */
export const LIST_PRICE_CENTS = {
  tool: { monthly: 1200, yearly: 9900 },
  all: { monthly: 2900, yearly: 24900 },
} as const
/** Sources that are paid seats. founding (invoices perk) and manual (comped) count as $0. */
export const PAID_SOURCES = ['single', 'all_access'] as const

export function maskEmail(email: string | null | undefined): string {
  if (!email) return ''
  const [local, domain] = email.split('@')
  if (!domain) return '•••'
  const d = domain.split('.')
  return `${local.slice(0, 1)}•••@${d[0].slice(0, 1)}•••.${d.slice(1).join('.') || '•••'}`
}

export function excludeDemo<T>(rows: T[], demoIds: Set<string>, idOf: (r: T) => string | null | undefined, include = false): T[] {
  if (include || demoIds.size === 0) return rows
  return rows.filter((r) => !demoIds.has(String(idOf(r) ?? '').toLowerCase()))
}

const DAY = 86_400_000
/** Count of timestamps per UTC day for the last `days` days ending at `now` (oldest first). */
export function dailySeries(isoDates: (string | null | undefined)[], days: number, now: Date = new Date()): number[] {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const start = end - (days - 1) * DAY
  const out = new Array(days).fill(0)
  for (const iso of isoDates) {
    if (!iso) continue
    const t = new Date(iso).getTime()
    if (Number.isNaN(t)) continue
    const day = Math.floor((t - start) / DAY)
    if (day >= 0 && day < days) out[day]++
  }
  return out
}
export function countSince(isoDates: (string | null | undefined)[], days: number, now: Date = new Date()): number {
  const from = now.getTime() - days * DAY
  return isoDates.filter((d) => d && new Date(d).getTime() >= from).length
}

export function userStatus(u: Pick<AdminUser, 'bannedUntil' | 'approved' | 'demo'>, now: Date = new Date()): UserStatus {
  if (u.bannedUntil && new Date(u.bannedUntil).getTime() > now.getTime()) return 'suspended'
  if (u.demo) return 'demo'
  return u.approved ? 'active' : 'pending'
}

export const billingOf = (plan: string | null): 'monthly' | 'yearly' => (/year|annual/i.test(plan || '') ? 'yearly' : 'monthly')

/** Active seats grouped by tool and source (paid vs comped). */
export function seatsByPlan(rows: AccessRow[]): { tool: string; paid: number; comped: number }[] {
  const m = new Map<string, { tool: string; paid: number; comped: number }>()
  for (const r of rows) {
    if (!r.active) continue
    const e = m.get(r.tool) ?? { tool: r.tool, paid: 0, comped: 0 }
    if ((PAID_SOURCES as readonly string[]).includes(r.source)) e.paid++
    else e.comped++
    m.set(r.tool, e)
  }
  return [...m.values()].sort((a, b) => b.paid + b.comped - (a.paid + a.comped) || a.tool.localeCompare(b.tool))
}

/** MRR estimate in cents from active paid app_access rows x list price (yearly normalized to /12). */
export function mrrEstimateCents(rows: AccessRow[]): number {
  let c = 0
  for (const r of rows) {
    if (!r.active || !(PAID_SOURCES as readonly string[]).includes(r.source)) continue
    const p = r.tool === 'all' ? LIST_PRICE_CENTS.all : LIST_PRICE_CENTS.tool
    const b = billingOf(r.plan)
    c += b === 'yearly' ? Math.round(p.yearly / 12) : p.monthly
  }
  return c
}

/** Normalize a Stripe recurring price to monthly cents. */
export function monthlyCents(unitAmount: number, interval: string, intervalCount = 1, quantity = 1): number {
  const per = interval === 'year' ? 12 : interval === 'week' ? 12 / 52 : interval === 'day' ? 12 / 365 : 1
  return Math.round((unitAmount * quantity) / (per * Math.max(1, intervalCount)))
}

export function searchRows<T>(rows: T[], q: string, fields: (r: T) => (string | null | undefined)[]): T[] {
  const s = q.trim().toLowerCase()
  if (!s) return rows
  return rows.filter((r) => fields(r).some((f) => (f || '').toLowerCase().includes(s)))
}
export function paginate<T>(rows: T[], page: number, size: number): { items: T[]; page: number; pages: number; total: number } {
  const pages = Math.max(1, Math.ceil(rows.length / size))
  const p = Math.min(Math.max(1, Math.floor(page) || 1), pages)
  return { items: rows.slice((p - 1) * size, p * size), page: p, pages, total: rows.length }
}

export const FLAG_KEY_RE = /^[a-z0-9_]{1,60}$/
/** Effective launch: build-time env OR runtime public flag. Default off. */
export function crmPublic(buildFlag: boolean, runtimeFlag: boolean | null | undefined): boolean {
  return buildFlag || runtimeFlag === true
}

/** Supabase auth ban_duration used for suspend (~100 years). Reversible: unsuspend sets 'none'. */
export const SUSPEND_DURATION = '876000h'
