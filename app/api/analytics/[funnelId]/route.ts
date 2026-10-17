import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Real numbers only: lead counts from fm_leads. Visitor tracking isn't built yet,
// so no visitor or conversion figures are reported (the old route returned mock data).
export async function GET(request: Request, context: { params: Promise<{ funnelId: string }> }) {
  const { funnelId } = await context.params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: funnel } = await (supabase.from('funnels') as any)
    .select('id').eq('id', funnelId).eq('user_id', user.id).single()
  if (!funnel) return NextResponse.json({ error: 'Funnel not found' }, { status: 404 })

  const days = 30
  const since = new Date(Date.now() - (days - 1) * 86_400_000)
  since.setUTCHours(0, 0, 0, 0)

  const [{ count: totalLeads }, { data: recent, error }] = await Promise.all([
    (supabase as any).from('fm_leads').select('id', { count: 'exact', head: true }).eq('funnel_id', funnelId),
    (supabase as any).from('fm_leads').select('created_at').eq('funnel_id', funnelId).gte('created_at', since.toISOString()),
  ])
  if (error) return NextResponse.json({ error: 'Could not load leads' }, { status: 500 })

  const buckets = new Map<string, number>()
  for (let i = 0; i < days; i++) buckets.set(new Date(since.getTime() + i * 86_400_000).toISOString().slice(0, 10), 0)
  for (const r of recent || []) {
    const d = String(r.created_at).slice(0, 10)
    if (buckets.has(d)) buckets.set(d, (buckets.get(d) || 0) + 1)
  }

  return NextResponse.json({
    totalLeads: totalLeads || 0,
    leadsLast30Days: (recent || []).length,
    leads: [...buckets].map(([date, value]) => ({ date, value })),
  })
}
