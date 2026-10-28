'use client'
import { pct, type Broadcast, type listStats } from '@/lib/emaillist/core'
import { Sparkline } from '@/components/admin/ui'
import { Stat, card, fmtDate } from './ui'

export function StatsView({ stats, broadcasts, cap, sentToday }: { stats: ReturnType<typeof listStats>; broadcasts: Broadcast[]; cap: number; sentToday: number }) {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Stats</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Subscribed" value={stats.subscribed.toLocaleString()} hint={`${stats.pending} awaiting confirmation`} />
        <Stat label="New (30 days)" value={`+${stats.new30}`} />
        <Stat label="Unsubscribed (30 days)" value={stats.unsub30} hint={`${pct(stats.unsubscribed, stats.total)} of everyone ever`} />
        <Stat label="Sent last 24h" value={`${sentToday}/${cap}`} hint="Your daily limit" />
      </div>
      <div className={card}><div className="mb-2 text-sm font-semibold">Signups, last 30 days</div><Sparkline data={stats.signups} height={80} /></div>
      <div className={card}>
        <div className="mb-3 text-sm font-semibold">Broadcasts</div>
        {broadcasts.length === 0 ? <p className="text-sm text-zinc-400">Nothing sent yet.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-sm"><thead className="text-left text-xs uppercase text-zinc-500"><tr><th className="pb-2">Subject</th><th>Sent</th><th>Delivered</th><th>Failed</th><th>Unsubs</th></tr></thead>
            <tbody className="divide-y divide-white/5">{broadcasts.map((b) => { const u = stats.unsubsByBroadcast[b.id] || 0; return <tr key={b.id}><td className="max-w-[220px] truncate py-2">{b.subject}</td><td>{fmtDate(b.sent_at)}</td><td>{b.sent_count}</td><td>{b.failed_count}</td><td>{u} ({pct(u, b.sent_count)})</td></tr> })}</tbody></table></div>
        )}
        <p className="mt-3 text-xs text-zinc-500">Opens and clicks aren’t tracked: no tracking pixels or link rewriting in v1.</p>
      </div>
    </div>
  )
}
