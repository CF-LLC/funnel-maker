import Link from 'next/link'
import { Download, Eye, Lock } from 'lucide-react'
import { Hero, Panel, Stat, ToolChip, fmtDate, fmtDateTime } from './ui'
import { DataTable } from './table'
import { UpdatesListToggle } from './actions'
import type { Alert, AtRisk, ToolHealth } from '@/lib/admin/batch3'

export const CsvLink = ({ kind, label = 'CSV' }: { kind: string; label?: string }) => (
  <a href={`/api/admin/export?kind=${kind}`} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-xs font-semibold ring-1 ring-white/15 hover:bg-white/10"><Download className="h-3.5 w-3.5" />{label}</a>
)

export function SignupsView({ users, updates }: { users: any[]; updates: any[] }) {
  const d = (n: number) => users.filter((u) => Date.now() - Date.parse(u.createdAt) < n * 864e5).length
  const active = updates.filter((u) => !u.unsubscribed_at)
  return (
    <div className="space-y-6">
      <Hero eyebrow="Admin · Signups" title="Who's joining" text="Accounts and the “new tools” list. Exports are logged to the audit trail." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Accounts" value={users.length} /><Stat label="Last 7 days" value={d(7)} /><Stat label="Last 30 days" value={d(30)} /><Stat label="Updates list" value={active.length} sub={`${updates.length - active.length} unsubscribed`} />
      </div>
      <Panel title="Accounts" action={<CsvLink kind="accounts" />}>
        <DataTable columns={['Email', 'Joined', 'Last sign-in', 'Tools']} pageSize={15} placeholder="Search email"
          rows={users.map((u) => ({ id: u.id, href: `/admin/users/${u.id}`, search: u.email, cells: [{ text: u.email || u.id, tone: 'strong' as const }, fmtDate(u.createdAt), u.lastSignInAt ? fmtDate(u.lastSignInAt) : 'never', u.tools.join(', ') || '—'] }))} />
      </Panel>
      <Panel title="“New tools” email list" action={<CsvLink kind="updates" />}>
        <p className="mb-3 text-xs text-zinc-500">Nothing is emailed from here. You can mark someone unsubscribed; rows are never deleted.</p>
        <ul className="divide-y divide-white/5">
          {updates.length === 0 && <li className="py-3 text-sm text-zinc-500">No signups yet.</li>}
          {updates.slice(0, 200).map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <span className="min-w-0"><span className="font-semibold break-all">{r.email}</span><span className="ml-2 text-xs text-zinc-500">{fmtDate(r.created_at)} · {r.source_page}{r.unsubscribed_at ? ` · unsubscribed ${fmtDate(r.unsubscribed_at)}` : ''}</span></span>
              <UpdatesListToggle id={Number(r.id)} email={r.email} subscribed={!r.unsubscribed_at} />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

const TONE: Record<ToolHealth['status'], string> = { healthy: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30', quiet: 'bg-zinc-500/15 text-zinc-300 ring-white/10', errors: 'bg-rose-500/15 text-rose-300 ring-rose-400/30', unknown: 'bg-amber-500/15 text-amber-300 ring-amber-400/30' }

export function HealthView({ tools, alerts, alertsEnabled, atRisk, recentlyOff, emailOf }: { tools: ToolHealth[]; alerts: Alert[]; alertsEnabled: boolean; atRisk: AtRisk[]; recentlyOff: any[]; emailOf: Record<string, string> }) {
  return (
    <div className="space-y-6">
      <Hero eyebrow="Admin · Health" title="Tools, churn & alerts" text="Per-tool usage, error counts from the last 7 days, and accounts that may be slipping away." />
      <Panel title="Alerts" action={<span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-300 ring-1 ring-amber-400/30"><Lock className="h-3 w-3" />{alertsEnabled ? 'Flag on · no sender wired' : 'Sending off'}</span>}>
        <p className="mb-3 text-xs text-zinc-500">Alerts are shown here only. Nothing is emailed or messaged; sending needs owner approval and a sender, which aren't built.</p>
        {alerts.length === 0 ? <p className="text-sm text-zinc-400">All quiet.</p> : (
          <ul className="space-y-2">{alerts.map((a) => <li key={a.key} className={`rounded-xl px-3 py-2 text-sm ring-1 ${a.level === 'warn' ? 'bg-rose-500/10 ring-rose-400/30 text-rose-100' : 'bg-white/[0.03] ring-white/10 text-zinc-200'}`}>{a.text}</li>)}</ul>
        )}
      </Panel>
      <Panel title="Per-tool usage & health">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t) => (
            <div key={t.key} className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10">
              <div className="flex items-center justify-between gap-2"><span className="font-semibold">{t.label}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ring-1 ${TONE[t.status]}`}>{t.status}</span></div>
              <div className="mt-2 grid grid-cols-4 gap-1 text-center text-xs text-zinc-400">
                {[['Total', t.total], ['7d', t.last7], ['30d', t.last30], ['Errors 7d', t.errors7]].map(([l, v]) => <div key={l as string}><div className="text-base font-black text-white">{v ?? '—'}</div>{l}</div>)}
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title={`At risk (${atRisk.length})`} action={<CsvLink kind="atrisk" />}>
        <DataTable columns={['Email', 'Why', 'Tools', 'Joined']} placeholder="Search email" empty="No paying accounts look idle."
          rows={atRisk.map((u) => ({ id: u.id, href: `/admin/users/${u.id}`, search: u.email, cells: [{ text: u.email || u.id, tone: 'strong' as const }, u.reason, u.tools.join(', '), fmtDate(u.createdAt)] }))} />
      </Panel>
      <Panel title="Access turned off (30 days)">
        {recentlyOff.length === 0 ? <p className="text-sm text-zinc-400">None.</p> : (
          <ul className="divide-y divide-white/5 text-sm">{recentlyOff.map((r, i) => <li key={i} className="py-2"><Link href={`/admin/users/${r.user_id}`} className="font-semibold hover:underline">{emailOf[r.user_id] || r.user_id}</Link> <span className="text-zinc-500">· {r.tool} · {r.source} · {fmtDateTime(r.updated_at)}</span></li>)}</ul>
        )}
      </Panel>
    </div>
  )
}

export function UserReadOnlyView({ v }: { v: any }) {
  const u = v.user
  return (
    <div className="space-y-6">
      <div role="status" className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-2xl bg-amber-500/15 px-4 py-3 text-sm text-amber-100 ring-1 ring-amber-400/40 backdrop-blur">
        <Eye className="h-4 w-4" /><strong>Viewing as {u.email || u.id}</strong><span className="text-amber-200/80">· read only · this view was logged</span>
        <Link href={`/admin/users/${u.id}`} className="ml-auto rounded-full bg-white px-3 py-1 text-xs font-bold text-black">Exit</Link>
      </div>
      <Hero eyebrow="Their dashboard" title={`Hi, ${(u.email || '').split('@')[0] || 'there'}`} text={`Joined ${fmtDate(u.createdAt)} · last sign-in ${u.lastSignInAt ? fmtDateTime(u.lastSignInAt) : 'never'}`} />
      <Panel title="Their tools">
        {v.access.length === 0 ? <p className="text-sm text-zinc-400">No tools.</p> : <div className="flex flex-wrap gap-2">{v.access.map((a: any) => <span key={a.tool} className={a.active ? '' : 'opacity-40'}><ToolChip t={a.tool} />{!a.active && <span className="ml-1 text-xs">off</span>}</span>)}</div>}
      </Panel>
      <Panel title="Recent work">
        {v.recent.length === 0 ? <p className="text-sm text-zinc-400">Nothing made yet.</p> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {v.recent.map((r: any) => (
              <div key={r.key} className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10">
                <div className="flex justify-between text-sm"><span className="font-semibold">{r.label}</span><span className="text-zinc-400">{r.count}</span></div>
                <ul className="mt-2 space-y-1 text-xs text-zinc-400">{r.items.map((i: any) => <li key={i.id} className="truncate">{i.title} <span className="text-zinc-600">· {fmtDate(i.created_at)}</span></li>)}</ul>
              </div>
            ))}
          </div>
        )}
      </Panel>
      <Panel title="Their notification settings">
        <p className="text-sm text-zinc-300">{v.prefs ? `Weekly digest ${v.prefs.weekly_digest ? 'on' : 'off'} · lead alerts ${v.prefs.new_lead_alerts ? 'on' : 'off'} · product updates ${v.prefs.product_updates ? 'on' : 'off'}` : 'Never changed (all off).'}</p>
      </Panel>
    </div>
  )
}
