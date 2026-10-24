import Link from 'next/link'
import { Navbar } from '@/components/nav/navbar'
import { Footer } from '@/components/nav/footer'
import { ArrowRight, Eye, MousePointerClick, Rocket, Smartphone, Sparkles, Zap } from 'lucide-react'
import { templates } from '@/data/templates'

export default function Home() {
  const showcase = templates.filter((t) => t.theme !== 'classic').slice(0, 4)
  return (
    <div className="min-h-screen flex flex-col bg-app">
      <Navbar />

      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-[28rem] w-[46rem] max-w-[140vw] -translate-x-1/2 rounded-full bg-brand opacity-20 blur-3xl" />
        <div className="container relative mx-auto px-4 pb-16 pt-16 text-center sm:pb-24 sm:pt-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white/80 px-3 py-1 text-xs font-semibold text-violet-800 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" /> SaaS Nation · Funnel Maker, Invoices &amp; Link-in-bio
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Funnels that look <span className="text-brand">amazing</span> on every screen
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Pick a template, click any text to change it, and publish. No code, no fuss. Ready in minutes.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/auth/register" className="press inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-brand px-8 text-base font-semibold text-white shadow-lg shadow-fuchsia-500/25 hover:brightness-110">
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/templates" className="press inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border bg-white px-8 text-base font-semibold hover:border-violet-400 hover:text-violet-700">
              <Eye className="h-4 w-4" /> See templates
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-16 sm:pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {showcase.map((t) => (
            <Link key={t.id} href={`/templates/preview/${t.id}`} className="lift group relative block aspect-[4/3] overflow-hidden rounded-2xl border" style={{ background: t.swatch }}>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
                <div className="text-xs font-semibold uppercase tracking-wide text-white/80">{t.effect}</div>
                <div className="flex items-center justify-between text-lg font-bold">{t.name}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="features" className="border-y bg-white/70 py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">Three steps. That&apos;s it.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { icon: Zap, title: 'Pick a template', text: 'Book a call, free download, waitlist, webinar, link hub and more.', color: 'bg-violet-100 text-violet-700' },
              { icon: MousePointerClick, title: 'Edit in place', text: 'Click any headline or paragraph in the live preview and type. Changes save automatically.', color: 'bg-fuchsia-100 text-fuchsia-700' },
              { icon: Rocket, title: 'Publish', text: 'Choose your link and go live. Leads land in your dashboard, protected from bots.', color: 'bg-pink-100 text-pink-700' },
            ].map(({ icon: Icon, title, text, color }, i) => (
              <div key={title} className="lift rounded-2xl border bg-card p-6">
                <div className="flex items-center gap-3">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}><Icon className="h-5 w-5" /></span>
                  <span className="text-sm font-semibold text-muted-foreground">Step {i + 1}</span>
                </div>
                <h3 className="mt-4 text-xl font-bold">{title}</h3>
                <p className="mt-2 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="container mx-auto grid items-center gap-10 px-4 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">Fast, mobile-first, and kind to every visitor</h2>
            <ul className="mt-6 space-y-3 text-muted-foreground">
              <li className="flex gap-3"><Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />Every template is tested on small phones with big, easy tap targets.</li>
              <li className="flex gap-3"><Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-fuchsia-600" />Effects use plain CSS or a tiny canvas, so pages stay quick.</li>
              <li className="flex gap-3"><Eye className="mt-0.5 h-5 w-5 shrink-0 text-pink-600" />Visitors who prefer less motion automatically get a calm version.</li>
            </ul>
          </div>
          <div className="rounded-3xl bg-brand p-8 text-white shadow-2xl shadow-fuchsia-500/25 sm:p-10">
            <p className="text-2xl font-bold">Ready when you are.</p>
            <p className="mt-2 text-white/90">Create your first funnel in about two minutes.</p>
            <Link href="/auth/register" className="press mt-6 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-white px-6 font-semibold text-violet-800 hover:bg-violet-50">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
