import Link from 'next/link'
import { notFound } from 'next/navigation'
import { findStore, storeProducts } from '@/lib/dlstore/public'
import { Poster } from '@/components/dlstore/poster'
import { DemoBar, StoreFooter, StoreHeader } from '@/components/dlstore/store-chrome'

export const dynamic = 'force-dynamic'
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const st = await findStore((await params).slug)
  return st ? { title: st.title || 'Store', description: st.blurb || undefined } : { title: 'Not found' }
}
export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const st = await findStore((await params).slug)
  if (!st || !st.slug) notFound()
  const products = await storeProducts(st)
  const [hero, ...rest] = products
  const title = st.title || 'Store'
  return (
    <>
      {st.demo && <DemoBar />}
      <div className="relative">
        <StoreHeader slug={st.slug} title={title} accent={st.accent} />
        <section className="cine-hero relative min-h-[78vh] sm:min-h-[70vh]">
          <div className="cine-art" style={{ background: `radial-gradient(80% 70% at 75% 20%, ${st.accent}66, transparent 60%), radial-gradient(60% 60% at 10% 90%, #312e81aa, transparent 60%), #050507` }} />
          <div className="cine-grain" />
          <div className="mx-auto grid max-w-6xl items-end gap-8 px-4 pb-14 pt-28 sm:grid-cols-[1fr_280px] sm:px-6 sm:pt-32">
            <div className="cine-rise">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-300">{products.length} {products.length === 1 ? 'title' : 'titles'}</p>
              <h1 className="mt-3 text-4xl font-black leading-[1.02] sm:text-6xl" style={{ textWrap: 'balance' as any }}>{hero ? hero.title : title}</h1>
              <p className="mt-4 max-w-xl text-base text-zinc-300 sm:text-lg">{hero?.subtitle || st.blurb}</p>
              {hero && <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/s/${st.slug}/${hero.slug}`} className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 font-bold text-black hover:bg-zinc-200">▶ View{hero.price_label ? ` · ${hero.price_label}` : ''}</Link>
              </div>}
            </div>
            {hero && <Link href={`/s/${st.slug}/${hero.slug}`} className="cine-rise cine-rise-2 mx-auto hidden w-56 sm:block sm:w-full"><Poster title={hero.title} kind={hero.kind} accent={st.accent} priceLabel={hero.price_label} size="lg" /></Link>}
          </div>
        </section>
      </div>
      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        {st.blurb && hero && <p className="mb-8 max-w-2xl text-sm text-zinc-400">{st.blurb}</p>}
        {products.length === 0 ? (
          <p className="py-16 text-center text-zinc-400">Nothing for sale yet. Check back soon.</p>
        ) : (
          <section>
            <h2 className="mb-3 text-lg font-bold sm:text-xl">{rest.length ? 'More from this store' : 'In this store'}</h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
              {(rest.length ? rest : products).map((p, i) => (
                <li key={p.id}><Link href={`/s/${st.slug}/${p.slug}`} className="block transition duration-300 hover:-translate-y-1 hover:scale-[1.03] focus-visible:scale-[1.03]">
                  <Poster title={p.title} kind={p.kind} accent={st.accent} priceLabel={p.price_label} index={i + 1} />
                </Link></li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <StoreFooter support={st.support_email} />
    </>
  )
}
