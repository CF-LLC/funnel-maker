import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: { funnelId: string } }
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: funnel } = await supabase
    .from('funnels')
    .select('*')
    .eq('id', params.funnelId)
    .eq('user_id', user.id)
    .single()

  if (!funnel) {
    return NextResponse.json({ error: 'Funnel not found' }, { status: 404 })
  }

  // Generate mock analytics data
  const mockData = {
    visitors: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      value: Math.floor(Math.random() * 100) + 50,
    })),
    leads: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      value: Math.floor(Math.random() * 50) + 10,
    })),
    conversions: [
      { name: 'Converted', value: Math.floor(Math.random() * 30) + 10 },
      { name: 'Not Converted', value: Math.floor(Math.random() * 70) + 30 },
    ],
    totalVisitors: 523,
    totalLeads: 156,
    conversionRate: 29.8,
  }

  return NextResponse.json(mockData)
}
