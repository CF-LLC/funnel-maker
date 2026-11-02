import Link from 'next/link'
import { Navbar } from '@/components/nav/navbar'
import { Footer } from '@/components/nav/footer'
import { faqJsonLd, type Faq } from '@/lib/landing/registry'
import { breadcrumbLd, ldHtml } from '@/lib/seo/schema'

/** Static marketing page layout (matches guides). FAQ JSON-LD is built from the exact visible FAQ text. */
export function LandingShell({ eyebrow, h1, description, colors, faqs, children, crumbs = [], ld = [] }: { eyebrow: string; h1: string; description: string; colors: [string, string]; faqs: Faq[]; children: React.ReactNode; crumbs?: { name: string; path: string }[]; ld?: Record<string, unknown>[] }) {
  const faqLd = ldHtml(faqJsonLd(faqs))
  const extra = [...(crumbs.length ? [breadcrumbLd(crumbs)] : []), ...ld]
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <Navbar />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqLd }} />}
      {extra.map((x, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldHtml(x) }} />)}
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-white/5">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40" style={{ background: `radial-gradient(60% 80% at 15% 0%, ${colors[0]}55, transparent 70%), radial-gradient(50% 70% at 90% 10%, ${colors[1]}40, transparent 70%)` }} />
          <div className="container relative mx-auto max-w-3xl px-4 py-10 sm:py-14">
            {crumbs.length > 1 ? <nav aria-label="Breadcrumb" className="text-xs text-zinc-400">{crumbs.map((c, i) => <span key={c.path}>{i > 0 && <span aria-hidden> / </span>}{i < crumbs.length - 1 ? <Link href={c.path} className="hover:text-white">{c.name}</Link> : c.name}</span>)}</nav> : null}
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-zinc-400">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">{h1}</h1>
            <p className="mt-3 text-zinc-300">{description}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/pricing" className="rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-500">See pricing</Link>
              <Link href="/free-tools" className="rounded-full border border-white/15 px-5 py-2 text-sm font-semibold hover:border-white/40">Free tools</Link>
            </div>
          </div>
        </section>
        <article className="container mx-auto max-w-3xl space-y-5 px-4 py-10 leading-relaxed text-zinc-300 [&_h2]:pt-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-white [&_ul]:space-y-2">
          {children}
          {faqs.length > 0 && (
            <section>
              <h2>FAQ</h2>
              <div className="mt-3 space-y-3">
                {faqs.map((f) => (
                  <details key={f.q} className="rounded-xl border border-white/10 bg-white/[0.03] p-4" open>
                    <summary className="cursor-pointer font-semibold text-white">{f.q}</summary>
                    <p className="mt-2">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </article>
      </main>
      <Footer />
    </div>
  )
}
