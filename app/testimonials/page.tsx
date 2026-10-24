import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import { reviewFormPath, reviewWallPath, STATUSES, type Status } from '@/lib/testimonials/core'
import { ReviewManager, SettingsForm } from '@/components/testimonials/dashboard'

export const dynamic = 'force-dynamic'

export default async function TestimonialsHome({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams
  const filter = (STATUSES as readonly string[]).includes(sp.status || '') ? (sp.status as Status) : null
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const db = supabase as any
  let q = db.from('tst_reviews').select('id, name, role, rating, body, photo_path, status, created_at').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(200)
  if (filter) q = q.eq('status', filter)
  const [{ data: rows }, { data: profile }, { data: settings }] = await Promise.all([
    q, db.from('lib_profiles').select('handle').eq('user_id', user!.id).maybeSingle(),
    db.from('tst_settings').select('accepting, linkinbio_layout, proposals_layout').eq('user_id', user!.id).maybeSingle(),
  ])
  const handle: string | undefined = profile?.handle
  const tab = (s: Status | null, label: string) => (
    <Link href={s ? `/testimonials?status=${s}` : '/testimonials'} className={`rounded-full px-3 py-1 text-sm ${filter === s ? 'bg-foreground text-background' : 'border'}`}>{label}</Link>
  )
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Testimonials</h1>
      {handle ? (
        <div className="rounded-xl border bg-background p-4 text-sm space-y-1">
          <p>Review link to share with clients: <a className="font-mono text-primary hover:underline" href={reviewFormPath(handle)} target="_blank">saasnation.site{reviewFormPath(handle)}</a></p>
          <p>Public wall: <a className="font-mono text-primary hover:underline" href={reviewWallPath(handle)} target="_blank">saasnation.site{reviewWallPath(handle)}</a></p>
          <p className="text-muted-foreground">Funnel embed: paste <code>{reviewWallPath(handle)}</code> (grid) or <code>{reviewWallPath(handle)}?layout=quote</code> into a funnel step&apos;s &quot;Embed testimonials&quot; field.</p>
        </div>
      ) : <p className="rounded-xl border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">Your review link uses your handle (saasnation.site/@handle/review). <Link href="/links" className="underline">Set your handle in Link-in-bio</Link>.</p>}
      <SettingsForm initial={settings ?? { accepting: true, linkinbio_layout: 'none', proposals_layout: 'none' }} exists={!!settings} />
      <div className="flex flex-wrap gap-2">{tab(null, 'All')}{tab('pending', 'Pending')}{tab('approved', 'Approved')}{tab('hidden', 'Hidden')}</div>
      <ReviewManager reviews={rows || []} />
    </div>
  )
}
