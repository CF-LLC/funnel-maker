import { NextResponse } from 'next/server'
import { pdGuard } from '@/lib/paid/guard'
import { openInvoices, recentMatches } from '@/lib/paid/server'
import { demoInvoices } from '@/lib/paid/demo'

export const dynamic = 'force-dynamic'
/** Open invoices + the remembered column mapping + recent confirmed matches. No bank data is ever stored. */
export async function GET() {
  const g = await pdGuard(false); if (g.err) return g.err
  if (g.demo) return NextResponse.json({ demo: true, invoices: demoInvoices(), mapping: null, tolerance_cents: 0, matches: [] })
  try {
    const [invoices, matches, map] = await Promise.all([openInvoices(g.db), recentMatches(g.db), g.db.from('pd_mappings').select('mapping, tolerance_cents').maybeSingle()])
    return NextResponse.json({ demo: false, invoices, matches, mapping: map.data?.mapping || null, tolerance_cents: map.data?.tolerance_cents || 0 })
  } catch { return NextResponse.json({ error: 'Could not load your invoices.' }, { status: 500 }) }
}
