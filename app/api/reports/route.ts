import { NextResponse } from 'next/server'
import { rpGuard } from '@/lib/reports/guard'
import { CLIENT_COLS, monthOf, type Client } from '@/lib/reports/core'
import { DEMO_OWNER, demoClients, demoReports } from '@/lib/reports/demo'

export const dynamic = 'force-dynamic'
/** Owner overview: brand + clients with report counts. */
export async function GET() {
  const g = await rpGuard(false); if (g.err) return g.err
  if (g.demo) {
    const clients = demoClients().map((c) => { const rs = demoReports(c.id); return { ...c, reports: rs.length, shared: rs.filter((r) => r.shared).length, latest: monthOf(rs[rs.length - 1].month) } })
    return NextResponse.json({ demo: true, brand: { business_name: DEMO_OWNER, logo_url: null }, clients })
  }
  const [{ data: cs }, { data: rs }, { data: b }] = await Promise.all([
    g.db.from('rp_clients').select(CLIENT_COLS).order('updated_at', { ascending: false }).limit(200),
    g.db.from('rp_reports').select('client_id, month, shared').limit(20000),
    g.db.from('rp_brand').select('business_name, logo_path').maybeSingle(),
  ])
  let logo_url: string | null = null
  if (b?.logo_path) { const { data } = await g.db.storage.from('rp-files').createSignedUrl(b.logo_path, 120); logo_url = data?.signedUrl || null }
  const clients = (cs || []).map((c: Client) => {
    const mine = (rs || []).filter((r: any) => r.client_id === c.id)
    const latest = mine.map((r: any) => r.month).sort().pop()
    return { ...c, reports: mine.length, shared: mine.filter((r: any) => r.shared).length, latest: latest ? monthOf(latest) : null }
  })
  return NextResponse.json({ demo: false, brand: { business_name: b?.business_name || null, logo_url }, clients }, { headers: { 'Cache-Control': 'no-store' } })
}
