import { NextResponse } from 'next/server'
import { rpGuard, bad, dbErr } from '@/lib/reports/guard'
import { CLIENT_COLS, MAX_REPORTS_PER_CLIENT, REPORT_COLS, duplicateRow, isMonth, isUuid, newReportRow } from '@/lib/reports/core'

/** New month for a client: from its saved template, or a duplicate of an earlier report (layout only; numbers blank). */
export async function POST(req: Request) {
  const g = await rpGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  if (!isUuid(b?.client_id)) return bad('Not found.', 404)
  if (!isMonth(b?.month)) return bad('Pick a month.')
  const { data: client } = await g.db.from('rp_clients').select(CLIENT_COLS).eq('id', b.client_id).maybeSingle()
  if (!client) return bad('Not found.', 404)
  const { count } = await g.db.from('rp_reports').select('id', { count: 'exact', head: true }).eq('client_id', client.id)
  if ((count || 0) >= MAX_REPORTS_PER_CLIENT) return bad(`Up to ${MAX_REPORTS_PER_CLIENT} reports per client.`)
  let row = newReportRow(client, b.month)
  if (b?.from_report_id) {
    if (!isUuid(b.from_report_id)) return bad('Not found.', 404)
    const { data: src } = await g.db.from('rp_reports').select(REPORT_COLS).eq('id', b.from_report_id).eq('client_id', client.id).maybeSingle()
    if (!src) return bad('Not found.', 404)
    row = duplicateRow(src, b.month)
  }
  const { data, error } = await g.db.from('rp_reports').insert({ user_id: g.user.id, client_id: client.id, ...row }).select(REPORT_COLS).single()
  if (error || !data) return dbErr(error, 'Could not create the report.')
  await g.db.from('rp_clients').update({ updated_at: new Date().toISOString() }).eq('id', client.id)
  return NextResponse.json({ report: data })
}
