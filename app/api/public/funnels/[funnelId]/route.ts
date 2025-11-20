import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  request: Request,
  context: { params: Promise<{ funnelId: string }> }
) {
  const { funnelId } = await context.params
  const { searchParams } = new URL(request.url)
  const bySlug = searchParams.get('bySlug') === 'true'

  try {
    const supabase = await createServerClient()

    // Check if looking up by slug or ID
    const query = bySlug
      ? (supabase.from('funnels') as any).select('*').eq('slug', funnelId).eq('is_public', true)
      : (supabase.from('funnels') as any).select('*').eq('id', funnelId).eq('is_public', true)

    const { data: funnel, error } = await query.single()

    if (error || !funnel) {
      return NextResponse.json({ error: 'Funnel not found or not public' }, { status: 404 })
    }

    return NextResponse.json({ funnel })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
