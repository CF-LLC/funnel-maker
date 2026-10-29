import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/nav/navbar'
import { Footer } from '@/components/nav/footer'
import { GUIDES, GUIDES_PATH, guidePath } from '@/lib/guides/registry'

export const metadata: Metadata = {
  title: 'Guides for freelancers and small studios',
  description: 'Short, practical guides for freelancers, coaches and small studios: handling scope creep, getting design sign-off and onboarding new clients.',
  alternates: { canonical: GUIDES_PATH },
}

export default function GuidesIndex() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <Navbar />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-white/5">
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 90% at 20% 0%, rgba(124,58,237,0.35), transparent 70%), radial-gradient(50% 80% at 85% 20%, rgba(219,39,119,0.25), transparent 70%)' }} />
          <div className="container relative mx-auto px-4 py-14 sm:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-300">Guides</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-6xl">Guides for client work</h1>
            <p className="mt-4 max-w-2xl text-zinc-300">Short, practical how-tos for freelancers, coaches and small studios. Free to read, no signup.</p>
          </div>
        </section>
        <div className="container mx-auto grid gap-5 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDES.map((g) => (
            <Link key={g.slug} href={guidePath(g.slug)} className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-xl transition hover:-translate-y-1 hover:border-white/25">
              <div aria-hidden className="h-2" style={{ background: `linear-gradient(90deg, ${g.colors[0]}, ${g.colors[1]})` }} />
              <div className="p-5">
                <h2 className="text-lg font-bold">{g.h1}</h2>
                <p className="mt-2 text-sm text-zinc-400">{g.description}</p>
                <span className="mt-4 inline-block text-sm font-semibold text-violet-300 group-hover:text-white">Read guide →</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="container mx-auto flex flex-wrap gap-3 px-4 pb-14">
          <Link href="/free-tools" className="rounded-full border border-white/15 px-5 py-2 text-sm font-semibold hover:border-white/40">Free tools</Link>
          <Link href="/pricing" className="rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-500">See pricing</Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
