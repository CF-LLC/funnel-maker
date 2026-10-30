// Owner reads + the client page (service role). Never exposes user_id, storage paths or the owner's email to clients.
import { serviceClient } from '@/lib/server/admin-client'
import { BUCKET, CLIENT_COLS, IMAGE_COLS, REPORT_COLS, SIGNED_TTL_SECONDS, isMonth, isToken, monthOf, type Image, type Report } from './core'

export type Brand = { business_name: string | null; logo_url: string | null }
async function signed(db: any, path: string | null | undefined): Promise<string | null> {
  if (!path) return null
  const { data } = await db.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL_SECONDS)
  return data?.signedUrl || null
}
/** Owner name for the client page: Report kit brand → Invoices business name → Link-in-bio name. */
export async function ownerBrand(db: any, userId: string): Promise<Brand> {
  const [{ data: b }, { data: inv }, { data: lib }] = await Promise.all([
    db.from('rp_brand').select('business_name, logo_path').eq('user_id', userId).maybeSingle(),
    db.from('inv_profiles').select('business_name').eq('user_id', userId).maybeSingle(),
    db.from('lib_profiles').select('display_name').eq('user_id', userId).maybeSingle(),
  ])
  return { business_name: b?.business_name || inv?.business_name || lib?.display_name || null, logo_url: await signed(db, b?.logo_path) }
}
export async function signedImages(db: any, reportId: string): Promise<(Image & { url: string | null })[]> {
  const { data } = await db.from('rp_images').select(`${IMAGE_COLS}, path`).eq('report_id', reportId).order('slot')
  return Promise.all((data || []).map(async ({ path, ...i }: any) => ({ ...i, url: await signed(db, path) })))
}

export type PublicReport = { client: string; owner: Brand; reports: Pick<Report, 'month' | 'kpi_values' | 'title'>[]; report: Report; images: (Image & { url: string | null })[] }
/** The client's view: only SHARED reports, only while the link is live and the owner still has access. */
export async function getPublicReport(token: string, month: string | null, viewerId: string | null, opts: { count?: boolean } = {}): Promise<PublicReport | null> {
  if (!isToken(token)) return null
  const db: any = serviceClient()
  const { data: c } = await db.from('rp_clients').select('id, user_id, name, revoked, view_count').eq('token', token).maybeSingle()
  if (!c || c.revoked) return null
  const { data: ok } = await db.rpc('rp_has_access', { uid: c.user_id })
  if (ok !== true) return null
  const { data: rs } = await db.from('rp_reports').select(REPORT_COLS).eq('client_id', c.id).eq('shared', true).order('month', { ascending: false }).limit(120)
  const reports = (rs || []) as Report[]
  const report = (isMonth(month) && reports.find((r) => monthOf(r.month) === month)) || reports[0]
  if (!report) return null
  const [owner, images] = await Promise.all([ownerBrand(db, c.user_id), signedImages(db, report.id)])
  if (opts.count !== false && viewerId !== c.user_id) await db.from('rp_clients').update({ last_viewed_at: new Date().toISOString(), view_count: (c.view_count || 0) + 1 }).eq('id', c.id)
  return { client: c.name, owner, reports: reports.map((r) => ({ month: r.month, kpi_values: r.kpi_values, title: r.title })), report, images }
}
export { CLIENT_COLS }
