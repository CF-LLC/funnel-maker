const EXAMPLES = [
  { src: '/examples/funnel-page.webp', w: 800, h: 727, alt: 'Example funnel page made with SaaS Nation: "Book a free 20-minute strategy call" with a short contact form', caption: 'Example funnel page (demo account, sample content)' },
  { src: '/examples/invoice.webp', w: 800, h: 670, alt: 'Example invoice from Sample Studio to Example Client Co. with two line items totaling $265.00', caption: 'Example invoice (sample data)' },
]

export function Examples() {
  return (
    <section aria-labelledby="examples-h" className="px-4 py-10 sm:px-8">
      <h2 id="examples-h" className="text-lg font-bold text-white sm:text-xl">What you get</h2>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        {EXAMPLES.map((e) => (
          <figure key={e.src} className="min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized webp, lazy */}
            <img src={e.src} width={e.w} height={e.h} alt={e.alt} loading="lazy" decoding="async" className="h-auto w-full rounded-xl bg-white ring-1 ring-white/10" />
            <figcaption className="mt-2 text-xs text-zinc-400">{e.caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
