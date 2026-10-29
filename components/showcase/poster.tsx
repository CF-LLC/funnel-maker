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
    case 'dataremoval':
      return (<g {...s}><path d="M100 22l58 22v44c0 38-26 66-58 80-32-14-58-42-58-80V44z" /><path d="M72 92l20 20 38-40" /><path d="M30 170h140" strokeDasharray="6 8" /></g>)
    case 'emaillist':
      return (<g {...s}><rect x="30" y="45" width="140" height="95" rx="10" /><path d="M30 55l70 50 70-50" /><path d="M140 25l25 0M152 13v25" /><circle cx="60" cy="165" r="6" /><circle cx="100" cy="165" r="6" /><circle cx="140" cy="165" r="6" /></g>)
    case 'downloads':
      return (<g {...s}><path d="M62 30h56l30 30v110H62z" /><path d="M118 30v30h30" /><path d="M105 80v55M85 117l20 20 20-20" /><path d="M40 180h120" /></g>)
    case 'portal':
      return (<g {...s}><path d="M60 175V35h80v140" /><path d="M60 35l45 18v140l-45-18" /><circle cx="92" cy="108" r="4" /><path d="M150 70l12 12 22-24" /><path d="M150 110l12 12 22-24" /></g>)
    case 'changelog':
      return (<g {...s}><rect x="45" y="30" width="110" height="145" rx="10" /><path d="M70 65h60M70 95h60M70 125h35" /><path d="M150 140v40M130 160h40" /></g>)
    case 'approvals':
      return (<g {...s}><rect x="40" y="35" width="120" height="95" rx="10" /><path d="M60 110l25-30 20 20 15-15 20 25" /><circle cx="150" cy="160" r="22" /><path d="M140 160l7 7 13-14" /></g>)
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
