import Link from 'next/link'
import { Navbar } from '@/components/nav/navbar'
import { Footer } from '@/components/nav/footer'
import { pageMeta, FREE_TEMPLATES_DESCRIPTION } from '@/lib/og/pages'
import { FREE_TEMPLATES, FREE_TEMPLATES_PATH, freeTemplatePath } from '@/lib/landing/free-templates'

export const metadata = pageMeta({ title: 'Free templates for freelancers and coaches', description: FREE_TEMPLATES_DESCRIPTION, path: FREE_TEMPLATES_PATH })

export default function FreeTemplatesIndex() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <Navbar />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-white/5">
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 90% at 20% 0%, rgba(124,58,237,0.35), transparent 70%), radial-gradient(50% 80% at 85% 20%, rgba(6,182,212,0.25), transparent 70%)' }} />
          <div className="container relative mx-auto px-4 py-14 sm:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-300">Free templates</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-6xl">Free templates for client work</h1>
            <p className="mt-4 max-w-2xl text-zinc-300">Copy-paste templates for freelancers, coaches and small studios: timesheets, proposals, scope changes, intake forms and more. Free, no signup.</p>
          </div>
        </section>
        <div className="container mx-auto grid gap-5 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
          {FREE_TEMPLATES.map((t) => (
            <Link key={t.slug} href={freeTemplatePath(t.slug)} className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-xl transition hover:-translate-y-1 hover:border-white/25">
              <div aria-hidden className="h-2" style={{ background: `linear-gradient(90deg, ${t.colors[0]}, ${t.colors[1]})` }} />
              <div className="p-5">
                <h2 className="text-lg font-bold">{t.h1}</h2>
                <p className="mt-2 text-sm text-zinc-400">{t.description}</p>
                <span className="mt-4 inline-block text-sm font-semibold text-violet-300 group-hover:text-white">Get the template →</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="container mx-auto flex flex-wrap gap-3 px-4 pb-14">
          <Link href="/free-tools" className="rounded-full border border-white/15 px-5 py-2 text-sm font-semibold hover:border-white/40">Free tools</Link>
          <Link href="/guides" className="rounded-full border border-white/15 px-5 py-2 text-sm font-semibold hover:border-white/40">Guides</Link>
          <Link href="/pricing" className="rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-500">See pricing</Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
