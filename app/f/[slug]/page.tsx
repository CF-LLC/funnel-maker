import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'

export default async function SlugFunnelPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params
  const supabase = await createServerClient()
  
  // Look up funnel by slug
  const { data: funnel } = await (supabase
    .from('funnels') as any)
    .select('id')
    .eq('slug', resolvedParams.slug)
    .eq('is_public', true)
    .single()
  
  if (!funnel) {
    redirect('/404')
  }
  
  // Redirect to the UUID-based public page
  redirect(`/public/${funnel.id}`)
}
