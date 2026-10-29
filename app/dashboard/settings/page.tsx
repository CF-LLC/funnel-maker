import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import { PrefsForm } from '@/components/dashboard/prefs-form'
import { DIGEST_ENABLED, buildDigest } from '@/lib/digest'
import { loadResults } from '@/lib/me/results'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirectTo=/dashboard/settings')
  const [{ data: prefs }, week] = await Promise.all([
    (supabase as any).from('user_notification_prefs').select('weekly_digest, new_lead_alerts, product_updates').eq('user_id', user.id).maybeSingle(),
    loadResults(supabase, user.id, 7),
  ])
  const digest = buildDigest(week)
  const card = 'rounded-2xl bg-[#121217] p-4 text-zinc-100 ring-1 ring-white/10 sm:p-6'
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-3xl font-bold">Settings</h1><p className="text-muted-foreground">Notifications and your data</p></div>
      <section className={card} aria-labelledby="notif-h">
        <h2 id="notif-h" className="text-sm font-bold uppercase tracking-wider text-zinc-300">Email notifications</h2>
        {!DIGEST_ENABLED && <p className="mt-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-200 ring-1 ring-amber-400/30" data-email-off>Email notifications aren&apos;t switched on yet. Your choices are saved now and will apply when they launch. We won&apos;t email you before then.</p>}
        <div className="mt-3"><PrefsForm initial={{ weekly_digest: !!prefs?.weekly_digest, new_lead_alerts: !!prefs?.new_lead_alerts, product_updates: !!prefs?.product_updates }} /></div>
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-zinc-300">Preview this week&apos;s digest</summary>
          <div className="mt-2 rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/10"><div className="font-semibold">{digest.subject}</div><ul className="mt-1 list-disc pl-5 text-zinc-300">{digest.lines.map((l) => <li key={l}>{l}</li>)}</ul></div>
        </details>
      </section>
      <section className={card} aria-labelledby="data-h">
        <h2 id="data-h" className="text-sm font-bold uppercase tracking-wider text-zinc-300">Your data</h2>
        <p className="mt-2 text-sm text-zinc-400">Download everything in your account (funnels, leads, invoices, forms, bookings and more) as one JSON file.</p>
        <a href="/api/me/export" download className="press mt-3 inline-flex min-h-[44px] items-center rounded-xl bg-white px-5 text-sm font-semibold text-black hover:brightness-95" data-export>Download my data</a>
      </section>
    </div>
  )
}
