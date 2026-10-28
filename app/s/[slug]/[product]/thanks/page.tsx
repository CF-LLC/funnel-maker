import { notFound } from 'next/navigation'
import { findProduct, findStore, keyValid } from '@/lib/dlstore/public'
import { Poster } from '@/components/dlstore/poster'
import { DemoBar, StoreFooter, StoreHeader } from '@/components/dlstore/store-chrome'
import { ClaimForm } from '@/components/dlstore/claim-form'
import { sendingEnvEnabled } from '@/lib/dlstore/core'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Thank you', robots: { index: false, follow: false } }
type P = { params: Promise<{ slug: string; product: string }>; searchParams: Promise<{ k?: string }> }
/** Where the seller's Stripe Payment Link redirects after payment. Nothing is created on GET; the buyer clicks to claim. */
export default async function ThanksPage({ params, searchParams }: P) {
  const { slug, product } = await params; const { k } = await searchParams
  const st = await findStore(slug); if (!st || !st.slug) notFound()
  const r = await findProduct(st, product); if (!r) notFound()
  const ok = await keyValid(st, product, k)
  const emailOn = !st.demo && st.email_delivery && sendingEnvEnabled()
  return (
    <>
      {st.demo && <DemoBar />}
      <div className="relative">
        <StoreHeader slug={st.slug} title={st.title || 'Store'} accent={st.accent} />
        <section className="cine-hero relative flex min-h-[90vh] items-center">
          <div className="cine-art" style={{ background: `radial-gradient(70% 60% at 50% 0%, ${st.accent}77, transparent 60%), #050507` }} />
          <div className="cine-grain" />
          <div className="mx-auto w-full max-w-md px-4 pb-10 pt-24 text-center">
            <div className="cine-rise mx-auto w-36"><Poster title={r.product.title} kind={r.product.kind} accent={st.accent} /></div>
            <p className="cine-rise cine-rise-1 mt-6 text-xs font-bold uppercase tracking-[0.3em]" style={{ color: st.accent === '#ffffff' ? '#e4e4e7' : st.accent }}>{ok ? 'Payment received' : 'Almost there'}</p>
            <h1 className="cine-rise cine-rise-1 mt-2 text-3xl font-black sm:text-4xl">{ok ? 'Thank you!' : 'Enter your access code'}</h1>
            <p className="cine-rise cine-rise-2 mt-3 text-zinc-300">{ok ? <>Your copy of <b className="text-white">{r.product.title}</b> is ready.</> : 'This link has expired or was changed. Use the access code from your receipt or the payment confirmation page.'}</p>
            <div className="cine-rise cine-rise-3 mt-6 text-left">
              {ok ? <ClaimForm store={st.slug} product={r.product.slug} mode="key" k={k} accent={st.accent} demo={st.demo} emailOn={emailOn} />
                : r.hasCode ? <ClaimForm store={st.slug} product={r.product.slug} mode="code" accent={st.accent} emailOn={emailOn} />
                : <p className="text-center text-sm text-zinc-400">Please contact the seller{st.support_email ? <> at <a className="text-white underline" href={`mailto:${st.support_email}`}>{st.support_email}</a></> : ''} with your receipt.</p>}
            </div>
            <p className="mt-6 text-xs text-zinc-500">Your private download link is personal and limited to {r.product.max_downloads} downloads. Bookmark it.</p>
          </div>
        </section>
      </div>
      <StoreFooter support={st.support_email} />
    </>
  )
}
