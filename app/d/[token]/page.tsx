import Link from 'next/link'
import { notFound } from 'next/navigation'
import { orderView } from '@/lib/dlstore/public'
import { fmtBytes } from '@/lib/dlstore/core'
import { Poster } from '@/components/dlstore/poster'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Your download', robots: { index: false, follow: false } }
const MSG = { revoked: 'This link was turned off by the seller.', expired: 'This link has expired.', used: 'You’ve used all the downloads on this link.' } as const
export default async function DownloadPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ e?: string; sent?: string }> }) {
  const { token } = await params; const sp = await searchParams
  const v = await orderView(token); if (!v) notFound()
  const accent = v.store.accent
  const until = new Date(v.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {v.demo && <div className="border-b border-cyan-400/30 bg-cyan-600/20 px-4 py-2 text-center text-xs text-cyan-100 sm:text-sm">Demo download page: the buttons don’t download anything.</div>}
      <section className="cine-hero relative">
        <div className="cine-art" style={{ background: `radial-gradient(70% 60% at 20% 0%, ${accent}66, transparent 60%), #050507` }} />
        <div className="cine-grain" />
        <div className="mx-auto grid max-w-4xl gap-8 px-4 pb-12 pt-10 sm:grid-cols-[220px_1fr] sm:pt-16">
          <div className="cine-rise mx-auto w-40 sm:w-full"><Poster title={v.product.title} kind={v.product.kind} accent={accent} /></div>
          <div className="cine-rise cine-rise-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: accent === '#ffffff' ? '#e4e4e7' : accent }}>{v.store.title || 'Your purchase'}</p>
            <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">{v.state === 'ok' ? 'Your files are ready' : 'Link not available'}</h1>
            <p className="mt-2 text-zinc-300">{v.product.title}</p>
            {sp.sent && <p role="status" className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">We emailed you a copy of this link.</p>}
            {sp.e && v.state === 'ok' && <p role="alert" className="mt-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">That download didn’t start. Please try again.</p>}
            {v.state !== 'ok' ? (
              <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-zinc-300">{MSG[v.state]} {v.store.support_email ? <>Contact <a className="text-white underline" href={`mailto:${v.store.support_email}`}>{v.store.support_email}</a> with your receipt.</> : 'Please contact the seller with your receipt.'}</p>
            ) : (
              <>
                <ul className="mt-6 space-y-2">
                  {v.files.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-xs font-black uppercase" style={{ background: `${accent}33`, color: accent === '#ffffff' ? '#fff' : accent }}>{(f.name.split('.').pop() || '').slice(0, 4)}</div>
                      <div className="min-w-0 flex-1"><div className="truncate font-semibold">{f.name}</div><div className="text-xs text-zinc-500">{fmtBytes(f.size_bytes)}</div></div>
                      {v.demo ? <span className="shrink-0 rounded-md bg-white/15 px-4 py-2 text-sm font-bold text-white/70">Download</span> : (
                        <form method="post" action="/api/downloads/file" className="shrink-0"><input type="hidden" name="t" value={token} /><input type="hidden" name="f" value={f.id} />
                          <button className="rounded-md px-4 py-2 text-sm font-bold hover:brightness-110" style={{ background: accent, color: accent === '#ffffff' ? '#000' : '#fff' }}>Download</button></form>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-zinc-500">{v.downloadsLeft} {v.downloadsLeft === 1 ? 'download' : 'downloads'} left · works until {until}. Each download link lasts 60 seconds. Please don’t share this page.</p>
              </>
            )}
            {v.store.slug && <p className="mt-8 text-sm"><Link href={`/s/${v.store.slug}`} className="text-zinc-400 hover:text-white">Browse more from {v.store.title || 'this store'} →</Link></p>}
          </div>
        </div>
      </section>
    </div>
  )
}
