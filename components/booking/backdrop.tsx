/** Poster-style hero art: drifting light blooms, a perspective grid and film grain. Pure SVG/CSS. */
export function Backdrop({ hue = 'violet', className = '' }: { hue?: 'violet' | 'rose' | 'mono'; className?: string }) {
  const c = hue === 'rose' ? ['#db2777', '#7c3aed', '#f59e0b'] : hue === 'mono' ? ['#3f3f46', '#52525b', '#7c3aed'] : ['#7c3aed', '#c026d3', '#2563eb']
  return (
    <>
      <svg className={`cine-art ${className}`} viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="bA" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor={c[0]} stopOpacity=".9" /><stop offset="1" stopColor={c[0]} stopOpacity="0" /></radialGradient>
          <radialGradient id="bB" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor={c[1]} stopOpacity=".75" /><stop offset="1" stopColor={c[1]} stopOpacity="0" /></radialGradient>
          <radialGradient id="bC" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor={c[2]} stopOpacity=".55" /><stop offset="1" stopColor={c[2]} stopOpacity="0" /></radialGradient>
          <linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#fff" stopOpacity=".14" /></linearGradient>
        </defs>
        <rect width="1200" height="600" fill="#0a0a0c" />
        <g className="cine-drift"><ellipse cx="260" cy="140" rx="520" ry="300" fill="url(#bA)" /></g>
        <g className="cine-drift-2"><ellipse cx="960" cy="120" rx="480" ry="280" fill="url(#bB)" /></g>
        <ellipse cx="640" cy="520" rx="520" ry="200" fill="url(#bC)" />
        <g stroke="url(#gl)" strokeWidth="1.2" fill="none">
          {Array.from({ length: 13 }, (_, i) => <line key={`v${i}`} x1={600} y1={300} x2={-600 + i * 200} y2={600} />)}
          {[360, 400, 450, 515, 600].map((y) => <line key={`h${y}`} x1="0" y1={y} x2="1200" y2={y} />)}
        </g>
      </svg>
      <div className="cine-grain" aria-hidden="true" />
    </>
  )
}

export function Monogram({ name, size = 'lg' }: { name: string; size?: 'lg' | 'md' }) {
  const ch = (name.replace(/^@/, '').trim()[0] || 'S').toUpperCase()
  const s = size === 'lg' ? 'h-20 w-20 text-3xl' : 'h-12 w-12 text-lg'
  return <div aria-hidden="true" className={`${s} grid place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-500 font-black text-white shadow-[0_18px_40px_-14px_rgba(192,38,211,.9)] ring-1 ring-white/30`}>{ch}</div>
}
