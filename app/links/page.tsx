import { isDemoUser } from '@/lib/demo'
import { createServerClient } from '@/lib/supabase'
import { LinkInBioEditor } from '@/components/linkinbio/editor'

export const dynamic = 'force-dynamic'

export default async function LinksHome() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const db = supabase as any
  const [{ data: profile }, { data: links }, { data: allRow }, { data: funnels }, { data: invoices }] = await Promise.all([
    db.from('lib_profiles').select('*').eq('user_id', user!.id).maybeSingle(),
    db.from('lib_links').select('*').eq('user_id', user!.id).order('position').order('created_at'),
    db.from('app_access').select('id').eq('user_id', user!.id).eq('tool', 'all').eq('active', true).limit(1),
    db.from('funnels').select('name, slug').eq('user_id', user!.id).eq('is_public', true).not('slug', 'is', null),
    db.from('inv_invoices').select('number, public_token').eq('user_id', user!.id).not('public_token', 'is', null).order('created_at', { ascending: false }).limit(10),
  ])
  const quick = [
    ...(funnels || []).map((f: any) => ({ title: f.name, path: `/f/${f.slug}` })),
    ...(invoices || []).map((i: any) => ({ title: `Invoice ${i.number}`, path: `/i/${i.public_token}` })),
  ]
  return <LinkInBioEditor userId={user!.id} initialProfile={profile} initialLinks={links || []} canHideBadge={(allRow || []).length > 0} quickAdd={quick} demo={isDemoUser(user!.id)} />
}
