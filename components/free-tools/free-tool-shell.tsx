import Link from 'next/link'
import { Navbar } from '@/components/nav/navbar'
import { Footer } from '@/components/nav/footer'
import { FREE_TOOLS_CTA, FREE_TOOLS_PATH, freeToolJsonLd, type FreeTool } from '@/lib/free-tools/registry'
import { SITE_URL } from '@/lib/free-tools/site-url'

// Shared layout for every free tool: H1, intro, JSON-LD, one soft CTA. No pop-ups, no signup walls.
export function FreeToolShell({ tool, children, note }: { tool: FreeTool; children: React.ReactNode; note?: string }) {
  const ld = JSON.stringify(freeToolJsonLd(tool, SITE_URL)).replace(/</g, '\\u003c')
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <Navbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-white/5">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40" style={{ background: `radial-gradient(60% 80% at 15% 0%, ${tool.colors[0]}55, transparent 70%), radial-gradient(50% 70% at 90% 10%, ${tool.colors[1]}40, transparent 70%)` }} />
          <div className="container relative mx-auto px-4 py-10 sm:py-14">
            <nav className="text-xs text-zinc-400"><Link href={FREE_TOOLS_PATH} className="hover:text-white">Free tools</Link> <span aria-hidden>/</span> {tool.name}</nav>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">{tool.h1.replace(/^./, (c) => c.toUpperCase())}</h1>
            <p className="mt-3 max-w-2xl text-zinc-300">{tool.description}</p>
            {note ? <p className="mt-3 inline-block rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">{note}</p> : null}
          </div>
        </section>
        <div className="container mx-auto px-4 py-8">{children}</div>
        <p className="container mx-auto px-4 pb-14 text-center text-sm text-zinc-400">
          <Link href={tool.feeds.href} className="underline decoration-zinc-600 underline-offset-4 hover:text-white">{FREE_TOOLS_CTA}</Link>
          <span className="text-zinc-500"> · {tool.feeds.name} by SaaS Nation</span>
        </p>
      </main>
      <Footer />
    </div>
  )
}
