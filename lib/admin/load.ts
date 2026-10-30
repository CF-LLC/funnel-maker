// Server-only. Admin dashboard data, read with the service role. Only call after requireAdminPage()/adminApiGuard().
import { serviceClient } from '@/lib/server/admin-client'
import { demoUserIds } from '@/lib/demo'
import { getStripe } from '@/lib/stripe'
import { parsePriceMap } from '@/lib/stripe-webhook'
import { countSince, dailySeries, excludeDemo, monthlyCents, mrrEstimateCents, seatsByPlan, type AccessRow, type AdminUser } from './core'

type Db = ReturnType<typeof serviceClient>

export const USAGE_TABLES: { key: string; label: string; table: string; userCol: string | null }[] = [
  { key: 'funnels', label: 'Funnels', table: 'funnels', userCol: 'user_id' },
  { key: 'leads', label: 'Funnel leads', table: 'fm_leads', userCol: null },
  { key: 'invoices', label: 'Invoices', table: 'inv_invoices', userCol: 'user_id' },
  { key: 'forms', label: 'Forms', table: 'frm_forms', userCol: 'user_id' },
  { key: 'responses', label: 'Form responses', table: 'frm_responses', userCol: 'user_id' },
  { key: 'proposals', label: 'Proposals', table: 'prp_proposals', userCol: 'user_id' },
  { key: 'testimonials', label: 'Testimonials', table: 'tst_reviews', userCol: 'user_id' },
  { key: 'bookings', label: 'Bookings', table: 'bk_bookings', userCol: 'user_id' },
  { key: 'linkinbio', label: 'Link profiles', table: 'lib_profiles', userCol: 'user_id' },
  { key: 'dataremoval', label: 'Data removal users', table: 'dr_profiles', userCol: 'user_id' },
  { key: 'crm', label: 'CRM contacts', table: 'crm_contacts', userCol: 'user_id' },
  { key: 'emaillist', label: 'Email subscribers', table: 'el_subscribers', userCol: 'user_id' },
  { key: 'downloads', label: 'Download products', table: 'dl_products', userCol: 'user_id' },
  { key: 'portal', label: 'Client portals', table: 'pt_portals', userCol: 'user_id' },
  { key: 'changelog', label: 'Change log projects', table: 'cl_projects', userCol: 'user_id' },
  { key: 'time', label: 'Time entries', table: 'tt_entries', userCol: 'user_id' },
  { key: 'expenses', label: 'Expenses', table: 'ex_expenses', userCol: 'user_id' },
  { key: 'reports', label: 'Report kit', table: 'rp_reports', userCol: 'user_id' },
  { key: 'paid', label: 'Paid?', table: 'pd_matches', userCol: 'user_id' },
  { key: 'approvals', label: 'Approval items', table: 'ap_items', userCol: 'user_id' },
  { key: 'orgs', label: 'Organizations', table: 'organizations', userCol: 'owner_id' },
]

const inList = (ids: string[]) => `(${ids.join(',')})`

async function demoFunnelIds(db: Db, demo: string[]): Promise<string[]> {
  if (!demo.length) return []
  const { data } = await db.from('funnels').select('id').in('user_id', demo).limit(5000)
  return (data ?? []).map((r: { id: string }) => r.id)
}

export async function loadUsers(db: Db = serviceClient()): Promise<AdminUser[]> {
  const demo = demoUserIds()
  const authUsers: any[] = []
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    authUsers.push(...data.users)
    if (data.users.length < 1000) break
  }
  const [{ data: rows }, { data: access }] = await Promise.all([
    db.from('users').select('id, approved').limit(20000),
    db.from('app_access').select('user_id, tool, active').eq('active', true).limit(50000),
  ])
  const approved = new Map((rows ?? []).map((r: any) => [r.id, !!r.approved]))
  const tools = new Map<string, string[]>()
  for (const a of access ?? []) tools.set(a.user_id, [...(tools.get(a.user_id) ?? []), a.tool])
  return authUsers
    .map((u) => ({
      id: u.id,
      email: u.email ?? '',
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      bannedUntil: u.banned_until ?? null,
      approved: approved.get(u.id) ?? false,
      demo: demo.has(String(u.id).toLowerCase()),
      tools: (tools.get(u.id) ?? []).sort(),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export type Mrr = { cents: number; source: 'stripe' | 'estimate'; note: string }

/** Live MRR from Stripe only when STRIPE_SECRET_KEY already exists server-side; counts only SaaS Nation prices (STRIPE_PRICE_MAP). Read-only. */
export async function loadMrr(access: AccessRow[]): Promise<Mrr> {
  const estimate: Mrr = { cents: mrrEstimateCents(access), source: 'estimate', note: 'Estimate: active paid app_access rows with a Stripe subscription ID × list price (yearly ÷ 12). Comped and founding seats count as $0.' }
  if (!process.env.STRIPE_SECRET_KEY) return { ...estimate, note: estimate.note + ' Stripe key not set on this server, so live MRR is unavailable.' }
  try {
    const map = parsePriceMap(process.env.STRIPE_PRICE_MAP)
    if (!Object.keys(map).length) return estimate
    let cents = 0
    let subs = 0
    for await (const sub of getStripe().subscriptions.list({ status: 'active', limit: 100 })) {
      for (const it of sub.items.data) {
        const p = it.price
        if (!map[p.id] || !p.recurring || p.unit_amount == null) continue
        cents += monthlyCents(p.unit_amount, p.recurring.interval, p.recurring.interval_count, it.quantity ?? 1)
      }
      if (++subs > 5000) break
    }
    return { cents, source: 'stripe', note: 'Live from Stripe: active subscriptions on SaaS Nation prices, normalized to monthly. Excludes discounts and taxes.' }
  } catch {
    return { ...estimate, note: estimate.note + ' Stripe read failed, so this is the estimate.' }
  }
}

export async function loadOverview(includeDemo = false) {
  const db = serviceClient()
  const demo = demoUserIds()
  const demoIds = [...demo]
  const users = await loadUsers(db)
  const counted = excludeDemo(users, demo, (u) => u.id, includeDemo)
  const { data: accessRaw } = await db.from('app_access').select('user_id, tool, plan, source, active, stripe_subscription_id').limit(50000)
  const access = excludeDemo((accessRaw ?? []) as AccessRow[], demo, (r) => r.user_id, includeDemo)
  const skipDemo = !includeDemo && demoIds.length > 0
  const dFunnels = skipDemo ? await demoFunnelIds(db, demoIds) : []
  const usage = await Promise.all(USAGE_TABLES.map(async (t) => {
    let q: any = db.from(t.table).select('*', { count: 'exact', head: true })
    if (skipDemo && t.userCol) q = q.not(t.userCol, 'in', inList(demoIds))
    if (skipDemo && !t.userCol && dFunnels.length) q = q.not('funnel_id', 'in', inList(dFunnels))
    const { count, error } = await q
    return { key: t.key, label: t.label, count: error ? null : count ?? 0 }
  }))
  const created = counted.map((u) => u.createdAt)
  const updCount = async (unsub: boolean) => {
    const q: any = db.from('tool_updates_signups').select('id', { count: 'exact', head: true })
    const { count, error } = await (unsub ? q.not('unsubscribed_at', 'is', null) : q.is('unsubscribed_at', null))
    return error ? null : count ?? 0
  }
  const [updActive, updUnsub] = await Promise.all([updCount(false), updCount(true)])
  return {
    updates: { active: updActive, unsubscribed: updUnsub },
    totals: {
      accounts: counted.length,
      last7: countSince(created, 7),
      last30: countSince(created, 30),
      suspended: counted.filter((u) => u.bannedUntil && new Date(u.bannedUntil) > new Date()).length,
      demoExcluded: includeDemo ? 0 : users.length - counted.length,
    },
    series30: dailySeries(created, 30),
    seats: seatsByPlan(access),
    mrr: await loadMrr(access),
    revenue: await loadRevenue(),
    usage,
  }
}

export async function loadActivity(includeDemo = false) {
  const db = serviceClient()
  const demo = [...demoUserIds()]
  const skip = !includeDemo && demo.length > 0
  const not = (q: any, col: string) => (skip ? q.not(col, 'in', inList(demo)) : q)
  const dFunnels = skip ? await demoFunnelIds(db, demo) : []
  let leadsQ: any = db.from('fm_leads').select('id, funnel_id, name, email, created_at').order('created_at', { ascending: false }).limit(200)
  if (dFunnels.length) leadsQ = leadsQ.not('funnel_id', 'in', inList(dFunnels))
  const [orgs, members, bookings, invoices, leads] = await Promise.all([
    not(db.from('organizations').select('id, name, owner_id, created_at').order('created_at', { ascending: false }).limit(500), 'owner_id'),
    db.from('org_members').select('org_id').limit(20000),
    not(db.from('bk_bookings').select('id, user_id, name, email, starts_at, status, created_at').order('created_at', { ascending: false }).limit(200), 'user_id'),
    not(db.from('inv_invoices').select('id, user_id, number, client_name, client_email, status, currency, created_at').order('created_at', { ascending: false }).limit(200), 'user_id'),
    leadsQ,
  ])
  const memberCount = new Map<string, number>()
  for (const m of members.data ?? []) memberCount.set(m.org_id, (memberCount.get(m.org_id) ?? 0) + 1)
  return {
    orgs: (orgs.data ?? []).map((o: any) => ({ ...o, members: memberCount.get(o.id) ?? 0 })),
    bookings: bookings.data ?? [],
    invoices: invoices.data ?? [],
    leads: leads.data ?? [],
  }
}

export async function loadSystem() {
  const db = serviceClient()
  const [errors, audit, flags] = await Promise.all([
    db.from('app_errors').select('id, route, message, user_id, created_at').order('created_at', { ascending: false }).limit(200),
    db.from('admin_audit').select('id, admin_id, action, target_user_id, detail, created_at').order('created_at', { ascending: false }).limit(200),
    db.from('feature_flags').select('key, enabled, description, updated_at').order('key'),
  ])
  return { errors: errors.data ?? [], audit: audit.data ?? [], flags: flags.data ?? [] }
}

export async function loadUserDetail(id: string) {
  const db = serviceClient()
  const users = await loadUsers(db)
  const user = users.find((u) => u.id === id)
  if (!user) return null
  const [access, counts, audit] = await Promise.all([
    db.from('app_access').select('tool, plan, source, active, created_at, updated_at').eq('user_id', id).order('tool'),
    Promise.all(USAGE_TABLES.filter((t) => t.userCol).map(async (t) => {
      const { count } = await (db.from(t.table).select('*', { count: 'exact', head: true }) as any).eq(t.userCol!, id)
      return { key: t.key, label: t.label, count: count ?? 0 }
    })),
    db.from('admin_audit').select('id, action, detail, created_at').eq('target_user_id', id).order('created_at', { ascending: false }).limit(50),
  ])
  return { user, access: access.data ?? [], counts, audit: audit.data ?? [] }
}

export async function audit(adminId: string, action: string, targetUserId: string | null, detail: Record<string, unknown>) {
  return serviceClient().from('admin_audit').insert({ admin_id: adminId, action, target_user_id: targetUserId, detail })
}

export type Revenue = { source: 'stripe' | 'estimate'; last30Cents: number | null; invoices: number; note: string }

/**
 * Collected revenue, last 30 days, read live from Stripe when STRIPE_SECRET_KEY is set on the server
 * (a restricted, read-only key: Invoices read + Subscriptions read is enough). Only invoices with a SaaS Nation price
 * (STRIPE_PRICE_MAP) count. Without a key it returns an explicit "estimate only" state. Never writes to Stripe.
 */
export async function loadRevenue(): Promise<Revenue> {
  if (!process.env.STRIPE_SECRET_KEY) return { source: 'estimate', last30Cents: null, invoices: 0, note: 'Estimate only: no Stripe key on this server, so collected revenue cannot be read. MRR above is estimated from seats.' }
  try {
    const map = parsePriceMap(process.env.STRIPE_PRICE_MAP)
    // Without a price map we can't tell SaaS Nation invoices from other products on the account, so never sum them all.
    if (!Object.keys(map).length) return { source: 'estimate', last30Cents: null, invoices: 0, note: 'Estimate only: STRIPE_PRICE_MAP is not set on this server, so SaaS Nation invoices cannot be told apart from other products.' }
    const since = Math.floor(Date.now() / 1000) - 30 * 86400
    let cents = 0
    let n = 0
    for await (const inv of getStripe().invoices.list({ status: 'paid', created: { gte: since }, limit: 100, expand: ['data.lines'] })) {
      const ours = inv.lines.data.some((l: any) => {
        const pid = l.pricing?.price_details?.price ?? l.price?.id
        return !!(pid && map[pid])
      })
      if (!ours) continue
      cents += inv.amount_paid ?? 0
      if (++n > 5000) break
    }
    return { source: 'stripe', last30Cents: cents, invoices: n, note: 'Live from Stripe (read-only): paid invoices in the last 30 days on SaaS Nation prices, after discounts, before Stripe fees and refunds.' }
  } catch {
    return { source: 'estimate', last30Cents: null, invoices: 0, note: 'Estimate only: the Stripe read failed (check the key is a restricted key with Invoices read).' }
  }
}

/** Acquisition funnel: visitors -> free tool -> signup -> paying, by first UTM source and by free tool. Demo accounts are excluded. */
export async function loadFunnel(days = 30) {
  const { buildFunnel } = await import('@/lib/acquisition/core')
  const db = serviceClient()
  const since = new Date(Date.now() - days * 86400_000).toISOString()
  const events: any[] = []
  for (let from = 0; from < 200_000; from += 1000) {
    const { data, error } = await db.from('acquisition_events').select('visitor_id, kind, free_tool, utm_source, utm_medium, utm_campaign, user_id, ref').gte('created_at', since).order('id').range(from, from + 999)
    if (error) return { days, error: true as const, total: null, bySource: [], byTool: [], byRef: [] }
    events.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  const demo = demoUserIds()
  const { data: access } = await db.from('app_access').select('user_id, tool, plan, source, active, stripe_subscription_id').eq('active', true).limit(50000)
  const { isPaidSeat } = await import('./core')
  const paid = new Set<string>(((access ?? []) as AccessRow[]).filter(isPaidSeat).map((r) => r.user_id))
  const clean = events.filter((e) => !(e.user_id && demo.has(String(e.user_id).toLowerCase())))
  return { days, error: false as const, ...buildFunnel(clean, paid) }
}
