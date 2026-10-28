import Link from 'next/link'
export function StoreHeader({ slug, title, accent }: { slug: string; title: string; accent: string }) {
  return (
    <header className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/80 to-transparent">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
        <Link href={`/s/${slug}`} className="min-w-0 truncate text-lg font-black uppercase tracking-wider sm:text-xl" style={{ color: accent === '#ffffff' ? '#fff' : accent }}>{title}</Link>
      </div>
    </header>
  )
}
export function DemoBar() {
  return <div className="relative z-30 border-b border-cyan-400/30 bg-cyan-600/20 px-4 py-2 text-center text-xs text-cyan-100 sm:text-sm">Demo store: nothing here is for sale and no payment is taken.</div>
}
export function StoreFooter({ support }: { support?: string | null }) {
  return (
    <footer className="mx-auto max-w-6xl px-4 pb-10 pt-16 text-xs text-zinc-500 sm:px-6">
      {support && <p>Questions? <a className="text-zinc-300 hover:underline" href={`mailto:${support}`}>{support}</a></p>}
      <p className="mt-2">Payments are handled by the seller’s own Stripe checkout. Store by <a href="https://saasnation.site" className="text-zinc-300 hover:underline">SaaS Nation</a>.</p>
    </footer>
  )
}
