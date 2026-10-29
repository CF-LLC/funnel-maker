import { adminApiGuard } from '@/lib/admin/guard'
import { audit, loadUsers } from '@/lib/admin/load'
import { atRiskUsers, isExportKind, toCsv } from '@/lib/admin/batch3'
import { serviceClient } from '@/lib/server/admin-client'
import { logError } from '@/lib/server/log-error'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

/** GET ?kind=accounts|updates|audit|atrisk → CSV download. Admin only (404 otherwise). Every export is audited. */
export async function GET(request: Request) {
  const g = await adminApiGuard()
  if (g.res) return g.res
  const kind = new URL(request.url).searchParams.get('kind')
  if (!isExportKind(kind)) return new Response('Unknown export', { status: 400 })
  try {
    const db = serviceClient()
    let csv = ''
    let rows = 0
    if (kind === 'accounts' || kind === 'atrisk') {
      const users = (await loadUsers(db)).filter((u) => !u.demo)
      if (kind === 'accounts') {
        csv = toCsv(['id', 'email', 'created_at', 'last_sign_in_at', 'approved', 'tools'], users.map((u) => [u.id, u.email, u.createdAt, u.lastSignInAt, u.approved, u.tools.join(' ')]))
        rows = users.length
      } else {
        const r = atRiskUsers(users)
        csv = toCsv(['id', 'email', 'reason', 'days_idle', 'last_sign_in_at', 'tools'], r.map((u) => [u.id, u.email, u.reason, u.daysIdle, u.lastSignInAt, u.tools.join(' ')]))
        rows = r.length
      }
    } else if (kind === 'updates') {
      const { data, error } = await db.from('tool_updates_signups').select('email, source_page, consented_at, unsubscribed_at, created_at').order('created_at', { ascending: false }).limit(20000)
      if (error) throw error
      csv = toCsv(['email', 'source_page', 'consented_at', 'unsubscribed_at', 'created_at'], (data ?? []).map((r: any) => [r.email, r.source_page, r.consented_at, r.unsubscribed_at, r.created_at]))
      rows = data?.length ?? 0
    } else {
      const { data, error } = await db.from('admin_audit').select('id, admin_id, action, target_user_id, detail, created_at').order('created_at', { ascending: false }).limit(20000)
      if (error) throw error
      csv = toCsv(['id', 'admin_id', 'action', 'target_user_id', 'detail', 'created_at'], (data ?? []).map((r: any) => [r.id, r.admin_id, r.action, r.target_user_id, r.detail, r.created_at]))
      rows = data?.length ?? 0
    }
    await audit(g.adminId, 'export.csv', null, { kind, rows })
    const day = new Date().toISOString().slice(0, 10)
    return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="saasnation-${kind}-${day}.csv"`, 'Cache-Control': 'no-store' } })
  } catch (e) {
    await logError('/api/admin/export', e, { userId: g.adminId })
    return new Response('Something went wrong', { status: 500 })
  }
}
