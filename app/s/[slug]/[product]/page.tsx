import Link from 'next/link'
import { notFound } from 'next/navigation'
import { findProduct, findStore } from '@/lib/dlstore/public'
import { fmtBytes } from '@/lib/dlstore/core'
import { Poster } from '@/components/dlstore/poster'
import { DemoBar, StoreFooter, StoreHeader } from '@/components/dlstore/store-chrome'
import { ClaimForm } from '@/components/dlstore/claim-form'

export const dynamic = 'force-dynamic'
type P = { params: Promise<{ slug: string; product: string }> }
export async function generateMetadata({ params }: P) {
  const { slug, product } = await params
  const st = await findStore(slug); const r = st && (await findProduct(st, product))
  return r ? { title: `${r.product.title} · ${st!.title || 'Store'}`, description: r.product.subtitle || undefined } : { title: 'Not found' }
}
export default async function ProductPage({ params }: P) {
  const { slug, product } = await params
  const st = await findStore(slug); if (!st || !st.slug) notFound()
  const r = await findProduct(st, product); if (!r) notFound()
  const p = r.product
  const buy = st.demo ? null : p.payment_link
  return (
    <>
      {st.demo && <DemoBar />}
      <div className="relative">
        <StoreHeader slug={st.slug} title={st.title || 'Store'} accent={st.accent} />
        <section className="cine-hero relative">
          <div className="cine-art" style={{ background: `radial-gradient(70% 60% at 80% 10%, ${st.accent}55, transparent 60%), #050507` }} />
          <div className="cine-grain" />
          <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-24 sm:grid-cols-[300px_1fr] sm:gap-12 sm:px-6 sm:pt-32">
            <div className="cine-rise mx-auto w-52 sm:w-full"><Poster title={p.title} kind={p.kind} accent={st.accent} size="lg" /></div>
            <div className="cine-rise cine-rise-1 min-w-0">
              <h1 className="text-3xl font-black leading-tight sm:text-5xl" style={{ textWrap: 'balance' as any }}>{p.title}</h1>
              {p.subtitle && <p className="mt-3 text-lg text-zinc-300">{p.subtitle}</p>}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {buy ? <a href={buy} rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-md px-7 py-3.5 text-base font-bold shadow-lg transition hover:brightness-110" style={{ background: st.accent, color: st.accent === '#ffffff' ? '#000' : '#fff' }} data-buy>Buy now{p.price_label ? ` · ${p.price_label}` : ''}</a>
                  : <span className="inline-flex cursor-not-allowed items-center rounded-md bg-white/20 px-7 py-3.5 font-bold text-white/80" title="Demo store">Buy now{p.price_label ? ` · ${p.price_label}` : ''} (demo)</span>}
                <span className="text-xs text-zinc-400">Secure checkout by Stripe. Instant download after payment.</span>
              </div>
              {p.description && <div className="mt-8 max-w-2xl whitespace-pre-line text-zinc-300">{p.description}</div>}
              {r.files.length > 0 && <div className="mt-8 max-w-2xl">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">What you get</h2>
                <ul className="mt-2 divide-y divide-white/10 rounded-xl border border-white/10 bg-white/[0.03]">
                  {r.files.map((f, i) => <li key={i} className="flex items-center justify-between gap-3 px-4 py-3 text-sm"><span className="min-w-0 truncate">{f.name}</span><span className="shrink-0 text-zinc-500">{fmtBytes(f.size_bytes)}</span></li>)}
                </ul>
              </div>}
              {(r.hasCode || st.demo) && <details className="mt-8 max-w-md rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <summary className="cursor-pointer text-sm font-semibold text-zinc-200">Already bought? Enter your access code</summary>
                <div className="mt-3"><ClaimForm store={st.slug} product={p.slug} mode="code" accent={st.accent} demo={st.demo} /></div>
              </details>}
              <p className="mt-6 text-sm"><Link href={`/s/${st.slug}`} className="text-zinc-400 hover:text-white">← Back to {st.title || 'the store'}</Link></p>
            </div>
          </div>
        </section>
      </div>
      <StoreFooter support={st.support_email} />
    </>
  )
}
