import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { isDemoUser } from '@/lib/demo'

const UNAVAILABLE = 'This page is unavailable.'
export const dynamic = 'force-dynamic'

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
      ? (supabase.from('funnels') as any).select('id, name, slug, template, steps, user_id').eq('slug', funnelId).eq('is_public', true)
      : (supabase.from('funnels') as any).select('id, name, slug, template, steps, user_id').eq('id', funnelId).eq('is_public', true)

    const { data: funnel, error } = await query.single()

    if (error || !funnel) {
      // Neutral message: same response for unknown, unpublished, or owner-lapsed funnels (RLS hides the latter).
      return NextResponse.json({ error: UNAVAILABLE }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
    }

    const { user_id, ...pub } = funnel
    return NextResponse.json({ funnel: { ...pub, demo: isDemoUser(user_id) } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
