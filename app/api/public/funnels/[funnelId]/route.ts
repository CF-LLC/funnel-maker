import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ funnelId: string }> }
) {
  const { funnelId } = await params

  try {
    const supabase = await createServerClient()

    // Check if funnel is public (no auth required for public funnels)
    const { data: funnel, error } = await (supabase
      .from('funnels') as any)
      .select('*')
      .eq('id', funnelId)
      .eq('is_public', true)
      .single()

    if (error || !funnel) {
      return NextResponse.json({ error: 'Funnel not found or not public' }, { status: 404 })
    }

    return NextResponse.json({ funnel })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
