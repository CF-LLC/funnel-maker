import { requireAdminPage } from '@/lib/admin/guard'
import { serviceClient } from '@/lib/server/admin-client'
import { summarize, type DayRow } from '@/lib/site-events/core'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admin · Traffic', robots: { index: false, follow: false } }

async function load(days: number) {
  const db = serviceClient()
  const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10)
  const rows: DayRow[] = []
  for (let from = 0; from < 500_000; from += 1000) {
    const { data, error } = await db.from('site_events').select('day, event, visitor_hash').gte('day', since).order('id').range(from, from + 999)
    if (error) return null
    rows.push(...((data ?? []) as DayRow[]))
    if (!data || data.length < 1000) break
  }
  const { data: tools } = await db.from('site_events').select('tool, event').gte('day', since).in('event', ['free_tool_used', 'checkout_clicked', 'checkout_completed', 'upgrade_clicked']).limit(50000)
  const byTool = new Map<string, Record<string, number>>()
  for (const t of (tools ?? []) as { tool: string | null; event: string }[]) {
    const k = t.tool || 'unknown'; const r = byTool.get(k) ?? {}; r[t.event] = (r[t.event] ?? 0) + 1; byTool.set(k, r)
  }
  return { ...summarize(rows), byTool: [...byTool.entries()].sort() }
}

export default async function AdminTraffic() {
  await requireAdminPage('/admin/traffic')
  const days = 30
  const s = await load(days)
  const th = 'px-3 py-2 text-left font-semibold text-zinc-400'
  const td = 'px-3 py-2 tabular-nums'
  if (!s) return <p className="p-6 text-red-400">Couldn&apos;t load site_events (has the migration been applied?).</p>
  const max = Math.max(1, ...s.funnel.map((f) => f.n))
  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 text-zinc-100">
      <div>
        <h1 className="text-2xl font-bold">Traffic (last {days} days)</h1>
        <p className="mt-1 text-sm text-zinc-400">Cookieless, first-party. No IPs or emails stored; visitors are a daily-rotating hash, so “visitors” is the sum of daily uniques. Do Not Track / GPC and bots are skipped. Days are UTC.</p>
      </div>
      <section aria-label="Funnel" className="space-y-2">
        <h2 className="text-lg font-bold">Funnel</h2>
        {s.funnel.map((f) => (
          <div key={f.label} className="flex items-center gap-3 text-sm">
            <span className="w-64 shrink-0 text-zinc-300">{f.label}</span>
            <span className="h-3 rounded bg-emerald-400/70" style={{ width: `${Math.max(2, (f.n / max) * 60)}%` }} />
            <span className="tabular-nums">{f.n}</span>
          </div>
        ))}
        <p className="text-xs text-zinc-500">Signups started: {s.signupsStarted} · Free-tool emails captured: {s.emails}</p>
      </section>
      <section aria-label="Daily counts">
        <h2 className="mb-2 text-lg font-bold">Daily</h2>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead><tr><th className={th}>Day</th><th className={th}>Pageviews</th><th className={th}>Visitors</th><th className={th}>Tool uses</th><th className={th}>Signups started</th><th className={th}>Signups</th><th className={th}>Checkout clicks</th><th className={th}>Checkouts</th><th className={th}>Emails</th></tr></thead>
            <tbody>
              {s.days.length === 0 ? <tr><td className={td} colSpan={9}>No events yet.</td></tr> : s.days.map((d) => (
                <tr key={d.day} className="border-t border-white/5"><td className={td}>{d.day}</td><td className={td}>{d.visits}</td><td className={td}>{d.visitors}</td><td className={td}>{d.freeToolUses}</td><td className={td}>{d.signupsStarted}</td><td className={td}>{d.signups}</td><td className={td}>{d.checkoutClicks}</td><td className={td}>{d.checkouts}</td><td className={td}>{d.emails}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section aria-label="By tool">
        <h2 className="mb-2 text-lg font-bold">By tool</h2>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead><tr><th className={th}>Tool</th><th className={th}>Free tool uses</th><th className={th}>Upgrade clicks</th><th className={th}>Checkout clicks</th><th className={th}>Checkouts</th></tr></thead>
            <tbody>
              {s.byTool.length === 0 ? <tr><td className={td} colSpan={5}>No events yet.</td></tr> : s.byTool.map(([k, r]) => (
                <tr key={k} className="border-t border-white/5"><td className={td}>{k}</td><td className={td}>{r.free_tool_used ?? 0}</td><td className={td}>{r.upgrade_clicked ?? 0}</td><td className={td}>{r.checkout_clicked ?? 0}</td><td className={td}>{r.checkout_completed ?? 0}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
