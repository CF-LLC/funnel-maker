import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowRight, Clock, MapPin } from 'lucide-react'
import { getBookingOwner } from '@/lib/booking/public'
import { bookPath } from '@/lib/booking/core'
import { DemoBanner } from '@/components/demo-banner'
import { Backdrop, Monogram } from '@/components/booking/backdrop'
import { isDemoUser } from '@/lib/demo'
import { MadeWith } from '@/components/made-with'

export const dynamic = 'force-dynamic'
type P = { params: Promise<{ handle: string }> }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const o = await getBookingOwner((await params).handle)
  return o ? { title: `Book time with ${o.display_name || '@' + o.handle}` } : { title: 'This page is unavailable.', robots: { index: false } }
}

export default async function BookIndex({ params }: P) {
  const o = await getBookingOwner((await params).handle)
  if (!o) notFound()
  const name = o.display_name || `@${o.handle}`
  return (
    <>{isDemoUser(o.user_id) && <DemoBanner />}
    <div className="min-h-screen bg-[#0a0a0c] text-white" style={{ ["--cine-fade" as string]: "#0a0a0c" }}>
      <header className="cine-hero px-5 pb-16 pt-16 sm:pb-24 sm:pt-24">
        <Backdrop />
        <div className="mx-auto max-w-3xl">
          <div className="cine-rise"><Monogram name={name} /></div>
          <p className="cine-rise cine-rise-1 mt-6 text-xs font-bold uppercase tracking-[.25em] text-violet-300">Book a time</p>
          <h1 className="cine-rise cine-rise-2 cine-title mt-2">Meet with {name}</h1>
          <p className="cine-rise cine-rise-3 mt-4 max-w-xl text-lg text-zinc-300">Pick a session, choose a time that works for you, and you&apos;re set. No back-and-forth.</p>
        </div>
      </header>
      <main className="mx-auto -mt-8 max-w-3xl px-5 pb-20">
        {o.types.length === 0 ? <p className="cine-glass rounded-2xl p-6 text-zinc-300">No sessions are open right now. Check back soon.</p> : (
          <ul className="grid gap-4">
            {o.types.map((t, i) => (
              <li key={t.id} className={`cine-rise cine-rise-${Math.min(i + 1, 3)}`}>
                <Link href={bookPath(o.handle, t.slug)} className="cine-card cine-glass group flex items-center gap-4 overflow-hidden rounded-2xl p-5 sm:p-6">
                  <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-violet-500 to-fuchsia-500" />
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-extrabold sm:text-xl">{t.name}</div>
                    {t.description && <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{t.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="cine-chip"><Clock className="h-3.5 w-3.5" />{t.duration_min} min</span>
                      {t.location && <span className="cine-chip"><MapPin className="h-3.5 w-3.5" />{t.location}</span>}
                    </div>
                  </div>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-black"><ArrowRight className="cine-arrow h-5 w-5" /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <MadeWith tool="booking" />
    </div>
    </>
  )
}
