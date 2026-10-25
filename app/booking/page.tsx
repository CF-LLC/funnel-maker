import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import { bookPath, weeklySchema } from '@/lib/booking/core'
import { emailConfigured } from '@/lib/booking/email'
import { BookingSettings, BookingsList, TypesManager } from '@/components/booking/dashboard'

export const dynamic = 'force-dynamic'

export default async function BookingHome() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const db = supabase as any
  const [{ data: profile }, { data: settings }, { data: av }, { data: types }, { data: bookings }] = await Promise.all([
    db.from('lib_profiles').select('handle').eq('user_id', user!.id).maybeSingle(),
    db.from('bk_settings').select('timezone, published').eq('user_id', user!.id).maybeSingle(),
    db.from('bk_availability').select('weekly').eq('user_id', user!.id).maybeSingle(),
    db.from('bk_types').select('id, slug, name, description, duration_min, buffer_before, buffer_after, min_notice_min, max_days_ahead, location, active').eq('user_id', user!.id).order('created_at'),
    db.from('bk_bookings').select('id, type_id, starts_at, ends_at, name, email, notes, status').eq('user_id', user!.id)
      .gte('ends_at', new Date(Date.now() - 30 * 86_400_000).toISOString()).order('starts_at').limit(200),
  ])
  const handle: string | undefined = profile?.handle
  const weekly = weeklySchema.safeParse(av?.weekly ?? [])
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Booking</h1>
      {handle ? (
        <p className="rounded-xl border bg-background p-4 text-sm">Your booking page: <a className="font-mono text-primary hover:underline" href={bookPath(handle)} target="_blank">saasnation.site{bookPath(handle)}</a>{!settings?.published && <span className="ml-2 text-amber-600">(not published yet)</span>}</p>
      ) : <p className="rounded-xl border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">Your booking page uses your handle (saasnation.site/@handle/book). <Link href="/links" className="underline">Set your handle in Link-in-bio</Link>.</p>}
      <BookingSettings initial={{ timezone: settings?.timezone ?? 'America/Chicago', published: settings?.published ?? false }} exists={!!settings} weekly={weekly.success ? weekly.data : []} weeklyExists={!!av} />
      <TypesManager types={types || []} />
      <BookingsList bookings={bookings || []} types={types || []} timezone={settings?.timezone ?? 'America/Chicago'} emailOn={emailConfigured()} />
      <p className="text-xs text-muted-foreground">{emailConfigured() ? 'New bookings email you and send the visitor a confirmation with a calendar invite. Cancelling emails them a notice.' : 'Email is not set up yet. Visitors see their confirmation on screen and can download a calendar file (.ics).'}</p>
    </div>
  )
}
