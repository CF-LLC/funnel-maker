import { timingSafeEqual } from 'node:crypto'

/**
 * Aggregates-only summary for HQ (hq.spockshop.com) on spock-server. Counts only: no names, emails, tokens or amounts
 * per customer. Fails closed: 404 unless INTERNAL_SUMMARY_TOKEN (>= 32 chars) is set and the caller sends it in
 * x-internal-token; anything that arrived through Cloudflare (any cf-* header, which the tunnel always adds; Next itself sets x-forwarded-for, so that can't be used) is refused, so the
 * public hostnames can never serve it even with the token.
 */
export const MIN_TOKEN = 32

export function allowSummary(headers: Headers, env: Record<string, string | undefined> = process.env): 200 | 403 | 404 {
  const want = (env.INTERNAL_SUMMARY_TOKEN ?? '').trim()
  if (want.length < MIN_TOKEN) return 404
  for (const k of headers.keys()) if (k.startsWith('cf-')) return 403
  const got = Buffer.from((headers.get('x-internal-token') ?? '').trim())
  const exp = Buffer.from(want)
  if (got.length !== exp.length || !timingSafeEqual(got, exp)) return 403
  return 200
}

type CountQ = { count: number | null; error: unknown }
export type SummaryCounts = {
  users: number; users7d: number; paidAccess: number
  bookingsUpcoming: number; bookings30d: number
  invoicesUnpaid: number; invoicesOverdue: number; invoicesPaid30d: number; invoices30d: number
}

/** Runs the count queries (head-only, exact) with the service client, excluding demo accounts. */
export async function loadCounts(sb: any, demoIds: Set<string>, now = Date.now()): Promise<SummaryCounts> {
  const d7 = new Date(now - 7 * 86_400_000).toISOString()
  const d30 = new Date(now - 30 * 86_400_000).toISOString()
  const nowIso = new Date(now).toISOString()
  const today = nowIso.slice(0, 10)
  const demo = [...demoIds]
  const c = (table: string, col = 'user_id') => {
    let q = sb.from(table).select('id', { count: 'exact', head: true })
    if (demo.length) q = q.not(col, 'in', `(${demo.join(',')})`)
    return q
  }
  const n = async (p: PromiseLike<CountQ>) => { const r = await p; if (r.error) throw new Error('count failed'); return r.count ?? 0 }
  const [users, users7d, paidAccess, bookingsUpcoming, bookings30d, invoicesUnpaid, invoicesOverdue, invoicesPaid30d, invoices30d] = await Promise.all([
    n(c('users', 'id')), n(c('users', 'id').gte('created_at', d7)),
    n(c('app_access').eq('active', true).neq('source', 'manual')),
    n(c('bk_bookings').eq('status', 'confirmed').gte('starts_at', nowIso)),
    n(c('bk_bookings').gte('created_at', d30)),
    n(c('inv_invoices').eq('status', 'unpaid')),
    n(c('inv_invoices').eq('status', 'unpaid').lt('due_date', today)),
    n(c('inv_invoices').eq('status', 'paid').gte('paid_at', d30)),
    n(c('inv_invoices').gte('created_at', d30)),
  ])
  return { users, users7d, paidAccess, bookingsUpcoming, bookings30d, invoicesUnpaid, invoicesOverdue, invoicesPaid30d, invoices30d }
}
