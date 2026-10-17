import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { leadsToCsv } from '@/lib/leads'

export const dynamic = 'force-dynamic'

// Owner-only lead list. ?format=csv downloads a CSV. RLS also enforces ownership.
export async function GET(request: Request, context: { params: Promise<{ funnelId: string }> }) {
  const { funnelId } = await context.params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: funnel } = await (supabase.from('funnels') as any)
    .select('id, name')
    .eq('id', funnelId)
    .eq('user_id', user.id)
    .single()
  if (!funnel) return NextResponse.json({ error: 'Funnel not found' }, { status: 404 })

  const { data: leads, error } = await (supabase as any)
    .from('fm_leads')
    .select('id, created_at, name, email, phone, message, template, utm')
    .eq('funnel_id', funnelId)
    .order('created_at', { ascending: false })
    .limit(10000)
  if (error) return NextResponse.json({ error: 'Could not load leads' }, { status: 500 })

  const format = new URL(request.url).searchParams.get('format')
  if (format === 'csv') {
    const safeName = String(funnel.name || 'funnel').replace(/[^a-z0-9-_]+/gi, '-').slice(0, 60)
    return new NextResponse(leadsToCsv(leads || []), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeName}-leads.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  }
  return NextResponse.json({ leads: leads || [] })
}
