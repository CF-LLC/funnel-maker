export function WhyThis() {
  const points = [
    ['One price', 'Each tool is one flat price, or get every tool with All Access.'],
    ['No per-feature upsells', 'A tool comes with all of its features. Nothing inside it is locked behind a higher tier.'],
    ['Built for solo businesses', 'Made for coaches, creators and one-person businesses, not big teams.'],
  ]
  return (
    <section aria-labelledby="why-h" className="px-4 py-10 sm:px-8">
      <h2 id="why-h" className="text-lg font-bold text-white sm:text-xl">Why this, not the big tools</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {points.map(([t, d]) => <li key={t} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="font-bold text-white">✓ {t}</p><p className="mt-1 text-sm text-zinc-400">{d}</p></li>)}
      </ul>
    </section>
  )
}
