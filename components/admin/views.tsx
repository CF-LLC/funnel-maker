// Admin views: pure presentation from plain data, so pages (live data) and the local preview (sample data) share them.
import Link from 'next/link'
import { userStatus, type AdminUser } from '@/lib/admin/core'
import { DataTable, type Row } from './table'
import { AccessControls, FlagToggles } from './actions'
import { DemoToggle, Hero, Panel, Sparkline, Stat, StatusPill, ToolChip, fmtDate, fmtDateTime, usd } from './ui'

export type Overview = {
  updates?: { active: number | null; unsubscribed: number | null }
  totals: { accounts: number; last7: number; last30: number; suspended: number; demoExcluded: number }
  series30: number[]
  seats: { tool: string; paid: number; comped: number }[]
  mrr: { cents: number; source: 'stripe' | 'estimate'; note: string }
  usage: { key: string; label: string; count: number | null }[]
}

export function OverviewView({ data, includeDemo }: { data: Overview; includeDemo: boolean }) {
  const { totals, mrr } = data
  const paid = data.seats.reduce((n, s) => n + s.paid, 0)
  const comped = data.seats.reduce((n, s) => n + s.comped, 0)
  return (
    <div className="space-y-6">
      <Hero eyebrow="Admin" title="SaaS Nation at a glance" text={includeDemo ? 'Including demo accounts.' : `Demo accounts are left out of every number${totals.demoExcluded ? ` (${totals.demoExcluded} hidden)` : ''}.`}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Accounts" value={totals.accounts} sub={totals.suspended ? `${totals.suspended} suspended` : undefined} />
          <Stat label="New, last 7 days" value={totals.last7} sub={`${totals.last30} in the last 30 days`}><Sparkline data={data.series30} /></Stat>
          <Stat label="Active seats" value={paid + comped} sub={`${paid} paid · ${comped} comped or founding`} />
          <Stat label={mrr.source === 'stripe' ? 'MRR (Stripe)' : 'MRR (estimate)'} value={usd(mrr.cents)} sub={mrr.source === 'stripe' ? 'Live' : 'Estimate'} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="flex-1 text-xs text-zinc-400">{mrr.note}</p>
          {data.updates && data.updates.active !== null && <p className="w-full text-xs text-zinc-400" data-updates-count>New-tools email list: <b className="text-white">{data.updates.active}</b> subscribed{data.updates.unsubscribed ? ` · ${data.updates.unsubscribed} unsubscribed` : ''} (counts only)</p>}
          <DemoToggle href={includeDemo ? '/admin' : '/admin?demo=1'} on={includeDemo} />
        </div>
      </Hero>
      <div className="grid gap-6 lg:grid-cols-5">
        <Panel title="Seats by plan" className="lg:col-span-2">
          {data.seats.length === 0 ? <p className="text-sm text-zinc-500">No active access yet.</p> : (
            <ul className="space-y-2">
              {data.seats.map((s) => {
                const total = s.paid + s.comped
                const max = Math.max(...data.seats.map((x) => x.paid + x.comped), 1)
                return (
                  <li key={s.tool}>
                    <div className="flex items-center justify-between text-sm"><ToolChip t={s.tool} /><span className="text-zinc-400"><b className="text-white">{s.paid}</b> paid · {s.comped} comped</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500" style={{ width: `${(total / max) * 100}%` }} /></div>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
        <Panel title="Usage by tool" className="lg:col-span-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {data.usage.map((u) => (
              <div key={u.key} className="rounded-xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/10">
                <div className="text-xl font-black">{u.count ?? '—'}</div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{u.label}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}

export function UsersView({ users, includeDemo }: { users: AdminUser[]; includeDemo: boolean }) {
  const rows: Row[] = users.map((u) => ({
    id: u.id,
    href: `/admin/users/${u.id}`,
    search: `${u.email} ${u.id} ${u.tools.join(' ')} ${userStatus(u)}`,
    cells: [{ text: u.email || u.id, tone: 'strong' }, fmtDate(u.createdAt), { text: u.lastSignInAt ? fmtDate(u.lastSignInAt) : 'Never', tone: u.lastSignInAt ? undefined : 'muted' }, u.tools.map((t) => (t === 'all' ? 'All Access' : t)).join(', ') || '—', { text: userStatus(u), tone: 'pill' }],
  }))
  return (
    <div className="space-y-6">
      <Hero eyebrow="Admin · Users" title={`${users.length} accounts`} text="Open an account to grant or revoke tools, or suspend it. Every change asks first and is logged.">
        <DemoToggle href={includeDemo ? '/admin/users' : '/admin/users?demo=1'} on={includeDemo} />
      </Hero>
      <Panel title="Accounts"><DataTable columns={['Email', 'Joined', 'Last sign-in', 'Access', 'Status']} rows={rows} pageSize={15} placeholder="Search email, tool or status" /></Panel>
    </div>
  )
}

export type UserDetail = {
  user: AdminUser
  access: { tool: string; plan: string | null; source: string; active: boolean; updated_at: string }[]
  counts: { key: string; label: string; count: number }[]
  audit: { id: number; action: string; detail: any; created_at: string }[]
}

export function UserDetailView({ d, tools, adminId, preview = false }: { d: UserDetail; tools: { id: string; name: string }[]; adminId: string; preview?: boolean }) {
  const u = d.user
  const s = userStatus(u)
  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="text-sm text-zinc-400 hover:underline">← All accounts</Link>
      <Hero eyebrow="Admin · Account" title={u.email || u.id}>
        <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-300">
          <StatusPill s={s} />
          <span>Joined {fmtDate(u.createdAt)}</span><span className="text-zinc-600">·</span>
          <span>Last sign-in {u.lastSignInAt ? fmtDateTime(u.lastSignInAt) : 'never'}</span>
          {u.bannedUntil && s === 'suspended' && <><span className="text-zinc-600">·</span><span className="text-rose-300">Suspended</span></>}
        </div>
      </Hero>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Access & actions">
          <AccessControls userId={u.id} label={u.email || 'this account'} tools={tools} active={d.access.filter((a) => a.active).map((a) => a.tool)} suspended={s === 'suspended'} self={u.id === adminId} preview={preview} />
          {d.access.length > 0 && (
            <ul className="mt-4 space-y-1 text-xs text-zinc-400">
              {d.access.map((a) => <li key={a.tool}><ToolChip t={a.tool} /> {a.active ? 'active' : 'off'} · {a.source}{a.plan ? ` · ${a.plan}` : ''} · updated {fmtDate(a.updated_at)}</li>)}
            </ul>
          )}
        </Panel>
        <Panel title="What they've made">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {d.counts.map((c) => <div key={c.key} className="rounded-xl bg-white/[0.03] px-3 py-2 ring-1 ring-white/10"><div className="text-lg font-black">{c.count}</div><div className="text-[11px] uppercase tracking-wider text-zinc-500">{c.label}</div></div>)}
          </div>
        </Panel>
      </div>
      <Panel title="Admin history">
        {d.audit.length === 0 ? <p className="text-sm text-zinc-500">No admin changes yet.</p> : (
          <ul className="space-y-1.5 text-sm">{d.audit.map((a) => <li key={a.id} className="flex flex-wrap gap-x-2"><span className="font-mono text-amber-200">{a.action}</span><span className="text-zinc-400">{a.detail?.tool ?? ''}</span><span className="ml-auto text-xs text-zinc-500">{fmtDateTime(a.created_at)}</span></li>)}</ul>
        )}
      </Panel>
    </div>
  )
}

export type Activity = {
  orgs: { id: string; name: string; owner_id: string; created_at: string; members: number }[]
  bookings: { id: string; user_id: string; name: string; email: string; starts_at: string; status: string; created_at: string }[]
  invoices: { id: string; user_id: string; number: string; client_name: string | null; client_email: string | null; status: string; currency: string; created_at: string }[]
  leads: { id: string; funnel_id: string; name: string | null; email: string | null; created_at: string }[]
}

export function ActivityView({ a, ownerEmail }: { a: Activity; ownerEmail: Record<string, string> }) {
  const owner = (id: string) => ownerEmail[id] || id.slice(0, 8)
  const ownerHref = (id: string) => `/admin/users/${id}`
  return (
    <div className="space-y-6">
      <Hero eyebrow="Admin · Activity" title="What's happening">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Organizations" value={a.orgs.length} /><Stat label="Recent bookings" value={a.bookings.length} />
          <Stat label="Recent invoices" value={a.invoices.length} /><Stat label="Recent leads" value={a.leads.length} />
        </div>
      </Hero>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Recent leads"><DataTable columns={['Lead', 'Email', 'Captured']} rows={a.leads.map((l) => ({ id: l.id, cells: [{ text: l.name || '—', tone: 'strong' }, l.email || '—', fmtDateTime(l.created_at)] }))} /></Panel>
        <Panel title="Recent bookings"><DataTable columns={['Booker', 'Email', 'Starts', 'Status', 'Owner']} rows={a.bookings.map((b) => ({ id: b.id, href: ownerHref(b.user_id), cells: [{ text: b.name, tone: 'strong' }, b.email, fmtDateTime(b.starts_at), { text: b.status, tone: 'pill' }, owner(b.user_id)] }))} /></Panel>
        <Panel title="Recent invoices"><DataTable columns={['Invoice', 'Client', 'Status', 'Created', 'Owner']} rows={a.invoices.map((i) => ({ id: i.id, href: ownerHref(i.user_id), cells: [{ text: i.number, tone: 'strong' }, i.client_name || i.client_email || '—', { text: i.status, tone: 'pill' }, fmtDate(i.created_at), owner(i.user_id)] }))} /></Panel>
        <Panel title="Organizations"><DataTable columns={['Name', 'Owner', 'Members', 'Created']} rows={a.orgs.map((o) => ({ id: o.id, href: ownerHref(o.owner_id), cells: [{ text: o.name, tone: 'strong' }, owner(o.owner_id), String(o.members), fmtDate(o.created_at)] }))} /></Panel>
      </div>
    </div>
  )
}

export type System = {
  errors: { id: number; route: string; message: string; user_id: string | null; created_at: string }[]
  audit: { id: number; admin_id: string; action: string; target_user_id: string | null; detail: any; created_at: string }[]
  flags: { key: string; enabled: boolean; description: string | null }[]
}

export function SystemView({ s, preview = false, emailOf }: { s: System; preview?: boolean; emailOf: Record<string, string> }) {
  return (
    <div className="space-y-6">
      <Hero eyebrow="Admin · System" title="Errors, flags and audit log" text="Feature flags take effect within about a minute, no rebuild needed. Everything is off unless you turn it on." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Feature flags"><FlagToggles flags={s.flags} preview={preview} /></Panel>
        <Panel title="Admin audit log"><DataTable columns={['Action', 'Target', 'Detail', 'When']} pageSize={8} rows={s.audit.map((a) => ({ id: String(a.id), href: a.target_user_id ? `/admin/users/${a.target_user_id}` : undefined, cells: [{ text: a.action, tone: 'strong' }, a.target_user_id ? emailOf[a.target_user_id] || a.target_user_id.slice(0, 8) : '—', a.detail ? Object.entries(a.detail).map(([k, v]) => `${k}=${v}`).join(' ') : '', fmtDateTime(a.created_at)] }))} empty="No admin actions yet." /></Panel>
      </div>
      <Panel title="Recent errors"><DataTable columns={['Route', 'Message', 'User', 'When']} pageSize={10} rows={s.errors.map((e) => ({ id: String(e.id), cells: [{ text: e.route, tone: 'strong' }, e.message, e.user_id ? emailOf[e.user_id] || e.user_id.slice(0, 8) : '—', fmtDateTime(e.created_at)] }))} empty="No errors logged. Nice." /></Panel>
    </div>
  )
}
