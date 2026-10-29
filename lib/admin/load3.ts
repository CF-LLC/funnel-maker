// Server-only. Admin batch 3 loaders (service role). Only call after requireAdminPage()/adminApiGuard().
import { serviceClient } from '@/lib/server/admin-client'
import { USAGE_TABLES, loadUsers } from './load'
import { atRiskUsers, computeAlerts, errorsForTool, healthStatus, type ToolHealth } from './batch3'

const NO_CREATED_AT = new Set(['dr_profiles'])
const since = (d: number) => new Date(Date.now() - d * 864e5).toISOString()

export async function loadSignups() {
  const db = serviceClient()
  const [users, upd] = await Promise.all([
    loadUsers(db),
    db.from('tool_updates_signups').select('id, email, source_page, consented_at, unsubscribed_at, created_at').order('created_at', { ascending: false }).limit(5000),
  ])
  return { users: users.filter((u) => !u.demo), updates: upd.data ?? [] }
}

export async function loadChurn() {
  const users = await loadUsers()
  const db = serviceClient()
  const { data: off } = await db.from('app_access').select('user_id, tool, source, updated_at').eq('active', false).gte('updated_at', since(30)).order('updated_at', { ascending: false }).limit(500)
  return { atRisk: atRiskUsers(users), recentlyOff: off ?? [], emailOf: Object.fromEntries(users.map((u) => [u.id, u.email])) }
}

export async function loadHealth() {
  const db = serviceClient()
  const { data: errs } = await db.from('app_errors').select('route, created_at').gte('created_at', since(7)).limit(5000)
  const routes = (errs ?? []).map((e: any) => e.route as string)
  const tools: ToolHealth[] = await Promise.all(USAGE_TABLES.map(async (t) => {
    const c = async (d?: number) => {
      let q: any = db.from(t.table).select('*', { count: 'exact', head: true })
      if (d && NO_CREATED_AT.has(t.table)) return null
      if (d) q = q.gte('created_at', since(d))
      const { count, error } = await q
      return error ? null : count ?? 0
    }
    const [total, last7, last30] = await Promise.all([c(), c(7), c(30)])
    const base = { key: t.key, label: t.label, total, last7, last30, errors7: errorsForTool(t.key, routes) }
    return { ...base, status: healthStatus(base) }
  }))
  const users = await loadUsers(db)
  const created = users.filter((u) => !u.demo).map((u) => Date.parse(u.createdAt))
  const now = Date.now()
  const signups7 = created.filter((t) => now - t < 7 * 864e5).length
  const signupsPrev7 = created.filter((t) => now - t >= 7 * 864e5 && now - t < 14 * 864e5).length
  const errors24h = (errs ?? []).filter((e: any) => now - Date.parse(e.created_at) < 864e5).length
  const alerts = computeAlerts({ errors24h, signups7, signupsPrev7, atRisk: atRiskUsers(users).length, quietTools: tools.filter((t) => t.status === 'quiet').map((t) => t.label) })
  return { tools, alerts }
}

/** Read-only snapshot of what a user sees. Service role reads, no writes except the caller's audit entry. */
export async function loadUserView(id: string) {
  const db = serviceClient()
  const users = await loadUsers(db)
  const user = users.find((u) => u.id === id)
  if (!user) return null
  const recent = await Promise.all(USAGE_TABLES.filter((t) => t.userCol).map(async (t) => {
    let q: any = (db.from(t.table).select('*', { count: 'exact' }) as any).eq(t.userCol!, id)
    if (!NO_CREATED_AT.has(t.table)) q = q.order('created_at', { ascending: false })
    const { data, count } = await q.limit(5)
    return { key: t.key, label: t.label, count: count ?? 0, items: (data ?? []).map((r: any) => ({ id: String(r.id), title: String(r.name ?? r.title ?? r.number ?? r.client_name ?? r.email ?? r.slug ?? r.id), created_at: r.created_at ?? null })) }
  }))
  const [{ data: access }, { data: prefs }] = await Promise.all([
    db.from('app_access').select('tool, plan, source, active').eq('user_id', id).order('tool'),
    db.from('user_notification_prefs').select('weekly_digest, new_lead_alerts, product_updates').eq('user_id', id).maybeSingle(),
  ])
  return { user, recent: recent.filter((r) => r.count > 0), access: access ?? [], prefs }
}
