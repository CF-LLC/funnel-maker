// Server-safe report renderer (client page /r/<token>, owner preview). Charts are plain SVG drawn from the numbers.
import { chartGeometry, fmtValue, monthLabel, type ViewSection } from '@/lib/reports/core'

const tone = (good: boolean | null) => (good == null ? 'text-zinc-400 bg-white/5' : good ? 'text-emerald-300 bg-emerald-500/10' : 'text-rose-300 bg-rose-500/10')
const arrow = (dir: string) => (dir === 'up' ? '▲' : dir === 'down' ? '▼' : '•')

export function Chart({ s }: { s: Extract<ViewSection, { type: 'chart' }> }) {
  const W = 600, H = 220
  const g = chartGeometry(s.series, W, H, 8)
  const pts = g.bars.map((b) => (b ? `${b.cx},${b.cy}` : null)).filter(Boolean).join(' ')
  const hasAny = s.series.some((x) => x.value != null)
  return (
    <figure className="rp-card rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <figcaption className="mb-3 flex items-baseline justify-between gap-2"><span className="font-semibold">{s.kpi.label}</span><span className="text-xs text-zinc-500">last {s.series.length} months</span></figcaption>
      {hasAny ? (
        <svg viewBox={`0 0 ${W} ${H + 28}`} className="h-auto w-full" role="img" aria-label={`${s.kpi.label} by month: ${s.series.map((x) => `${monthLabel(x.month, 'short')} ${fmtValue(x.value, s.kpi.format)}`).join(', ')}`}>
          <defs><linearGradient id={`rpg-${s.kpi.key}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#38bdf8" /><stop offset="1" stopColor="#6366f1" /></linearGradient></defs>
          <line x1="8" x2={W - 8} y1={g.zero} y2={g.zero} stroke="#ffffff22" />
          {s.kind === 'bar'
            ? g.bars.map((b, i) => b && <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="6" fill={`url(#rpg-${s.kpi.key})`} opacity={i === g.bars.length - 1 ? 1 : 0.55} />)
            : <><polyline points={pts} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />{g.bars.map((b, i) => b && <circle key={i} cx={b.cx} cy={b.cy} r={i === g.bars.length - 1 ? 6 : 4} fill="#38bdf8" />)}</>}
          {s.series.map((x, i) => {
            const slot = (W - 16) / s.series.length, cx = 8 + slot * i + slot / 2
            return <g key={x.month}><text x={cx} y={H + 18} textAnchor="middle" fontSize="13" fill="#a1a1aa">{monthLabel(x.month, 'short')}</text>
              {x.value != null && g.bars[i] && <text x={cx} y={Math.max(14, g.bars[i]!.cy - 8)} textAnchor="middle" fontSize="12" fill="#e4e4e7">{fmtValue(x.value, s.kpi.format)}</text>}</g>
          })}
        </svg>
      ) : <p className="py-8 text-center text-sm text-zinc-500">No numbers yet.</p>}
    </figure>
  )
}

export function ReportView({ sections, logoUrl, owner }: { sections: ViewSection[]; logoUrl?: string | null; owner?: string | null }) {
  return (
    <div className="space-y-5">
      {sections.map((s, i) => {
        switch (s.type) {
          case 'title': return (
            <header key={i} className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logoUrl && <img src={logoUrl} alt={owner ? `${owner} logo` : 'Logo'} className="h-14 w-14 shrink-0 rounded-xl bg-white object-contain p-1" />}
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-300">{s.subtitle || 'Monthly report'} · {monthLabel(s.month)}</p>
                <h2 className="mt-1 text-2xl font-black leading-tight sm:text-4xl">{s.title}</h2>
              </div>
            </header>
          )
          case 'kpis': return (
            <div key={i} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {s.cards.map((c) => (
                <div key={c.kpi.key} className="rp-card rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="truncate text-xs uppercase tracking-wider text-zinc-400">{c.kpi.label}</div>
                  <div className="mt-1 text-2xl font-extrabold tabular-nums sm:text-3xl">{c.text}</div>
                  {c.change ? <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tone(c.change.good)}`}><span aria-hidden>{arrow(c.change.dir)}</span>{c.change.label}<span className="font-normal text-zinc-500">vs {monthLabel(c.prevMonth!, 'short')}</span></div>
                    : <div className="mt-2 text-xs text-zinc-500">No earlier month to compare</div>}
                </div>
              ))}
            </div>
          )
          case 'chart': return <Chart key={i} s={s} />
          case 'notes': return (
            <section key={i} className="rp-card rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
              <h3 className="font-semibold">{s.heading}</h3>
              <div className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-300">{s.text}</div>
            </section>
          )
          case 'images': return (
            <section key={i}>
              <h3 className="mb-2 font-semibold">{s.heading}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {s.images.map((im, j) => im?.url ? (
                  <figure key={j} className="rp-card overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={im.url} alt={im.caption || `Screenshot ${j + 1}`} className="max-h-[480px] w-full object-contain" loading="lazy" />
                    {im.caption && <figcaption className="px-3 py-2 text-xs text-zinc-400">{im.caption}</figcaption>}
                  </figure>
                ) : null)}
              </div>
            </section>
          )
        }
      })}
    </div>
  )
}
