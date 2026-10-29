import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/nav/navbar'
import { Footer } from '@/components/nav/footer'
import { FREE_TOOLS, freeToolPath } from '@/lib/free-tools/registry'

export const metadata: Metadata = {
  title: 'Free Tools – No Signup, Browser-Only',
  description: 'Free tools for freelancers and small businesses. They run in your browser, need no signup and never store what you type.',
  alternates: { canonical: '/free-tools' },
}

export default function FreeToolsIndex() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <Navbar />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-white/5">
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 90% at 20% 0%, rgba(124,58,237,0.35), transparent 70%), radial-gradient(50% 80% at 85% 20%, rgba(219,39,119,0.25), transparent 70%)' }} />
          <div className="container relative mx-auto px-4 py-14 sm:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-300">Free · No signup</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-6xl">Free tools</h1>
            <p className="mt-4 max-w-2xl text-zinc-300">Small, fast tools that run in your browser. No account, no pop-ups, and nothing you type is stored.</p>
          </div>
        </section>
        <div className="container mx-auto grid gap-5 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
          {FREE_TOOLS.map((t) => (
            <Link key={t.slug} href={freeToolPath(t.slug)} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-xl transition hover:-translate-y-1 hover:border-white/25">
              <div className="relative h-40 overflow-hidden" style={{ background: `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]})` }}>
                <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent" />
                <span aria-hidden className="absolute bottom-3 left-4 text-5xl drop-shadow-lg transition group-hover:scale-110">{t.emoji}</span>
                <span className="absolute right-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Free</span>
              </div>
              <div className="p-5">
                <h2 className="text-lg font-bold">{t.name}</h2>
                <p className="mt-1 text-sm text-zinc-400">{t.blurb}</p>
                <span className="mt-4 inline-block text-sm font-semibold text-violet-300 group-hover:text-white">Open tool →</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  )
}
