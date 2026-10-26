import { SOURCE_LABEL, STATUS_LABEL, type CrmStatus, type Source } from '@/lib/crm/core'

const SRC_CLS: Record<Source, string> = {
  form: 'bg-sky-500/15 text-sky-200 ring-sky-400/30',
  booking: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30',
  proposal: 'bg-amber-500/15 text-amber-200 ring-amber-400/30',
  invoice: 'bg-fuchsia-500/15 text-fuchsia-200 ring-fuchsia-400/30',
}
const STATUS_CLS: Record<CrmStatus, string> = {
  lead: 'bg-violet-500/20 text-violet-100 ring-violet-400/40',
  active: 'bg-emerald-500/20 text-emerald-100 ring-emerald-400/40',
  past: 'bg-zinc-500/20 text-zinc-200 ring-zinc-400/30',
  not_a_fit: 'bg-rose-500/15 text-rose-200 ring-rose-400/30',
}
export const SourceBadge = ({ s, n }: { s: Source; n?: number }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${SRC_CLS[s]}`}>{SOURCE_LABEL[s]}{n && n > 1 ? <span className="opacity-70">×{n}</span> : null}</span>
)
export const StatusPill = ({ s }: { s: CrmStatus }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${STATUS_CLS[s]}`}>{STATUS_LABEL[s]}</span>
)
export function Avatar({ name, email, size = 40 }: { name: string; email: string; size?: number }) {
  const ini = (name || email).split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')
  let h = 0; for (const ch of email) h = (h * 31 + ch.charCodeAt(0)) % 360
  return <span aria-hidden className="grid shrink-0 place-items-center rounded-full font-bold text-white ring-1 ring-white/15" style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, hsl(${h} 70% 45%), hsl(${(h + 50) % 360} 70% 30%))` }}>{ini}</span>
}
export const money = (cents: number, currency: string | null) => new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100)
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' })
