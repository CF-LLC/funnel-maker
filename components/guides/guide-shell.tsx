import Link from 'next/link'
import { Navbar } from '@/components/nav/navbar'
import { Footer } from '@/components/nav/footer'
import { guidePath, type Guide } from '@/lib/guides/registry'
import { SITE_URL } from '@/lib/free-tools/site-url'

/** Static guide layout: dark, readable, one soft CTA to the paid tool + a free tool. Article JSON-LD. */
export function GuideShell({ g, children }: { g: Guide; children: React.ReactNode }) {
  const ld = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: g.h1, description: g.description, url: `${SITE_URL}${guidePath(g.slug)}`, publisher: { '@type': 'Organization', name: 'SaaS Nation', url: SITE_URL } }).replace(/</g, '\\u003c')
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <Navbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-white/5">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40" style={{ background: `radial-gradient(60% 80% at 15% 0%, ${g.colors[0]}55, transparent 70%), radial-gradient(50% 70% at 90% 10%, ${g.colors[1]}40, transparent 70%)` }} />
          <div className="container relative mx-auto max-w-3xl px-4 py-10 sm:py-14">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Guide</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">{g.h1}</h1>
            <p className="mt-3 text-zinc-300">{g.description}</p>
          </div>
        </section>
        <article className="guide container mx-auto max-w-3xl space-y-5 px-4 py-10 leading-relaxed text-zinc-300 [&_h2]:pt-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_ol>li]:list-decimal [&_strong]:text-white [&_ul]:space-y-2 [&_ol]:space-y-2">
          {children}
        </article>
        <section className="container mx-auto max-w-3xl px-4 pb-14">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <h2 className="text-lg font-bold text-white">Tools that help</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href={g.tool.href} className="font-semibold text-white underline decoration-zinc-600 underline-offset-4 hover:decoration-white">{g.tool.name}</Link> <span className="text-zinc-400">· paid tool, $12/mo or $99/yr, or included in All Access. See pricing.</span></li>
              <li><Link href={g.freeTool.href} className="font-semibold text-white underline decoration-zinc-600 underline-offset-4 hover:decoration-white">{g.freeTool.name}</Link> <span className="text-zinc-400">· free, no signup.</span></li>
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
