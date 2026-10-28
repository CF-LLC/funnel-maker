// Admin dashboard building blocks (server-safe, no hooks).
import Link from 'next/link'
import type { UserStatus } from '@/lib/admin/core'

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' }) : '—'
export const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) + ' CT' : '—'
export const usd = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100)

export function Hero({ eyebrow, title, text, children }: { eyebrow: string; title: string; text?: string; children?: React.ReactNode }) {
  return (
    <section className="cine-hero relative overflow-hidden rounded-3xl p-6 ring-1 ring-white/10 sm:p-8" style={{ background: 'radial-gradient(120% 140% at 0% 0%, #b4530955, transparent 55%), radial-gradient(120% 120% at 100% 100%, #be123c44, transparent 60%), #111116' }}>
      <div className="cine-grain" />
      <p className="relative text-xs font-bold uppercase tracking-[.25em] text-amber-300">{eyebrow}</p>
      <h1 className="relative mt-2 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
      {text && <p className="relative mt-2 max-w-2xl text-sm text-zinc-300">{text}</p>}
      {children && <div className="relative mt-6">{children}</div>}
    </section>
  )
}

export function Stat({ label, value, sub, children }: { label: string; value: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
      <div className="text-2xl font-black tracking-tight sm:text-3xl">{value}</div>
      <div className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
      {children}
    </div>
  )
}

export function Panel({ title, action, children, className = '' }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-[#121217] p-4 ring-1 ring-white/10 sm:p-5 ${className}`}>
      <div className="mb-3 flex items-center gap-2"><h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">{title}</h2><div className="ml-auto">{action}</div></div>
      {children}
    </section>
  )
}

export function Sparkline({ data, height = 56 }: { data: number[]; height?: number }) {
  const w = 300
  const max = Math.max(1, ...data)
  const step = data.length > 1 ? w / (data.length - 1) : w
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(height - 4 - (v / max) * (height - 8)).toFixed(1)}`)
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="mt-3 h-14 w-full" role="img" aria-label={`Signups per day, last ${data.length} days`}>
      <defs><linearGradient id="spark" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#f59e0b" stopOpacity=".45" /><stop offset="1" stopColor="#f59e0b" stopOpacity="0" /></linearGradient></defs>
      <polygon points={`0,${height} ${pts.join(' ')} ${w},${height}`} fill="url(#spark)" />
      <polyline points={pts.join(' ')} fill="none" stroke="#fbbf24" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}

const ST: Record<UserStatus, string> = {
  active: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30',
  pending: 'bg-amber-500/15 text-amber-200 ring-amber-400/30',
  suspended: 'bg-rose-500/20 text-rose-200 ring-rose-400/40',
  demo: 'bg-violet-500/20 text-violet-100 ring-violet-400/40',
}
export const StatusPill = ({ s }: { s: UserStatus }) => <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ring-1 ${ST[s]}`}>{s}</span>
export const ToolChip = ({ t }: { t: string }) => <span className="inline-flex rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-zinc-200 ring-1 ring-white/10">{t === 'all' ? 'All Access' : t}</span>

export function DemoToggle({ href, on }: { href: string; on: boolean }) {
  return <Link href={href} className="rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-white/15 hover:bg-white/10">{on ? 'Hide demo accounts' : 'Include demo accounts'}</Link>
}
