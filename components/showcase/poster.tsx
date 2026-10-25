// Poster art for a tool: pure CSS gradient + inline SVG motif + big type. No external images.
type Colors = { from: string; to: string; accent: string }

function Motif({ id, accent }: { id: string; accent: string }) {
  const s = { stroke: accent, fill: 'none', strokeWidth: 3, opacity: 0.55 } as const
  switch (id) {
    case 'funnels':
      return (<g {...s}><path d="M20 30h160l-60 70v60l-40 20v-80z" /><path d="M45 55h110M70 80h60" /></g>)
    case 'invoices':
      return (<g {...s}><rect x="50" y="20" width="100" height="140" rx="8" /><path d="M70 50h60M70 75h60M70 100h35" /><circle cx="130" cy="135" r="14" /></g>)
    case 'linkinbio':
      return (<g {...s}><rect x="40" y="30" width="120" height="26" rx="13" /><rect x="40" y="70" width="120" height="26" rx="13" /><rect x="40" y="110" width="120" height="26" rx="13" /><circle cx="100" cy="160" r="8" /></g>)
    case 'forms':
      return (<g {...s}><rect x="35" y="30" width="130" height="24" rx="6" /><rect x="35" y="70" width="130" height="24" rx="6" /><rect x="35" y="110" width="20" height="20" rx="4" /><path d="M40 120l5 5 8-10M70 120h80" /></g>)
    case 'proposals':
      return (<g {...s}><path d="M55 20h70l30 30v110H55z" /><path d="M125 20v30h30" /><path d="M75 115l15 15 30-35" /></g>)
    case 'testimonials':
      return (<g {...s}><path d="M100 30l12 26 28 3-21 19 6 28-25-14-25 14 6-28-21-19 28-3z" /><path d="M40 130c20 10 100 10 120 0M60 155h80" /></g>)
    case 'booking':
      return (<g {...s}><rect x="35" y="35" width="130" height="120" rx="10" /><path d="M35 65h130M70 25v20M130 25v20" /><path d="M75 105l15 15 35-35" /></g>)
    default:
      return (<g {...s}><circle cx="100" cy="90" r="50" /></g>)
  }
}

export function Poster({ id, name, colors, className = '' }: { id: string; name: string; colors: Colors; className?: string }) {
  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className}`}
      style={{ background: `radial-gradient(120% 80% at 80% 0%, ${colors.to} 0%, transparent 60%), linear-gradient(160deg, ${colors.from} 0%, #09090b 95%)` }}
    >
      <svg viewBox="0 0 200 190" aria-hidden className="absolute inset-x-0 top-[8%] mx-auto w-[78%]"><Motif id={id} accent={colors.accent} /></svg>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: colors.accent }}>SaaS Nation</div>
        <div className="mt-0.5 text-xl font-black leading-none tracking-tight text-white sm:text-2xl">{name}</div>
      </div>
    </div>
  )
}
