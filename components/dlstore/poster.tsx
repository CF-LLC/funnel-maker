// Netflix-style product poster: CSS/SVG only (no uploaded cover needed). Server- and client-safe.
import { KINDS, type Kind } from '@/lib/dlstore/core'

function Motif({ kind }: { kind: Kind }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (kind) {
    case 'course': return <g {...s}><rect x="40" y="50" width="120" height="80" rx="10" /><path d="M88 75v30l26-15z" /><path d="M60 150h80" /></g>
    case 'audio': return <g {...s}><path d="M60 110V90a40 40 0 0180 0v20" /><rect x="50" y="105" width="20" height="35" rx="6" /><rect x="130" y="105" width="20" height="35" rx="6" /></g>
    case 'video': return <g {...s}><rect x="35" y="60" width="95" height="70" rx="10" /><path d="M130 85l35-20v60l-35-20" /></g>
    case 'template': return <g {...s}><rect x="50" y="40" width="100" height="120" rx="8" /><path d="M65 65h70M65 85h70M65 105h40" /><rect x="65" y="120" width="30" height="22" rx="3" /></g>
    case 'bundle': return <g {...s}><path d="M100 40l55 25v60l-55 25-55-25V65z" /><path d="M45 65l55 25 55-25M100 90v60" /></g>
    case 'pdf': return <g {...s}><path d="M60 35h55l30 30v100H60z" /><path d="M115 35v30h30" /><path d="M75 100h50M75 120h50M75 140h30" /></g>
    default: return <g {...s}><path d="M100 45v75M70 95l30 30 30-30" /><path d="M55 150h90" /></g>
  }
}
export function Poster({ title, kind, accent, priceLabel, size = 'md', index = 0 }: { title: string; kind: Kind; accent: string; priceLabel?: string | null; size?: 'md' | 'lg'; index?: number }) {
  const hue = ['#1e1b4b', '#3b0764', '#052e16', '#1c1917', '#082f49', '#4a044e'][index % 6]
  return (
    <div className={`relative isolate aspect-[2/3] w-full overflow-hidden rounded-xl bg-[#111] shadow-2xl ring-1 ring-white/10 ${size === 'lg' ? 'rounded-2xl' : ''}`}
      style={{ backgroundImage: `radial-gradient(120% 80% at 20% 0%, ${accent}cc, transparent 55%), linear-gradient(160deg, ${hue}, #050507 85%)` }}>
      <svg viewBox="0 0 200 200" aria-hidden className="absolute left-1/2 top-[14%] w-[62%] -translate-x-1/2 text-white/80 drop-shadow-[0_6px_24px_rgba(0,0,0,.5)]"><Motif kind={kind} /></svg>
      <div className="cine-grain" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-3 pt-16 sm:p-4 sm:pt-20">
        <div className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: accent === '#ffffff' ? '#e4e4e7' : accent }}>{KINDS[kind] || 'Download'}</div>
        <div className={`mt-1 font-extrabold leading-[1.05] text-white ${size === 'lg' ? 'text-3xl sm:text-4xl' : 'text-lg sm:text-xl'}`} style={{ textWrap: 'balance' as any }}>{title}</div>
        {priceLabel && <div className="mt-2 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur">{priceLabel}</div>}
      </div>
    </div>
  )
}
