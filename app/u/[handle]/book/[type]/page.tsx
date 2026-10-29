import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, Clock, MapPin } from 'lucide-react'
import { getBookingOwner, openSlots } from '@/lib/booking/public'
import { bookPath } from '@/lib/booking/core'
import { emailConfigured } from '@/lib/booking/email'
import { DemoBanner } from '@/components/demo-banner'
import { SlotPicker } from '@/components/booking/slot-picker'
import { Backdrop, Monogram } from '@/components/booking/backdrop'
import { isDemoUser } from '@/lib/demo'
import { MadeWith } from '@/components/made-with'

export const dynamic = 'force-dynamic'
type P = { params: Promise<{ handle: string; type: string }>; searchParams: Promise<{ embed?: string }> }

async function load(params: P['params']) {
  const { handle, type } = await params
  const o = await getBookingOwner(handle)
  const t = o?.types.find((x) => x.slug === type)
  return o && t ? { o, t } : null
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const r = await load(params)
  return r ? { title: `${r.t.name} with ${r.o.display_name || '@' + r.o.handle}` } : { title: 'This page is unavailable.', robots: { index: false } }
}

export default async function BookType({ params, searchParams }: P) {
  const r = await load(params)
  if (!r) notFound()
  const { o, t } = r
  const embed = (await searchParams).embed === '1'
  const demo = isDemoUser(o.user_id)
  const slots = await openSlots(o, t)
  const name = o.display_name || `@${o.handle}`
  return (
    <>{demo && <DemoBanner />}
    <div className="min-h-screen bg-[#0a0a0c] text-white" style={{ ["--cine-fade" as string]: "#0a0a0c" }}>
      <header className={`cine-hero px-5 ${embed ? 'pb-10 pt-8' : 'pb-20 pt-10 sm:pb-28 sm:pt-14'}`}>
        <Backdrop hue="rose" />
        <div className="mx-auto max-w-5xl">
          {!embed && <Link href={bookPath(o.handle)} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm text-zinc-200 backdrop-blur hover:bg-white/20"><ArrowLeft className="h-4 w-4" />All sessions</Link>}
          <div className="mt-8 flex items-center gap-4 cine-rise">
            <Monogram name={name} size="md" />
            <p className="text-sm text-zinc-300">with <span className="font-bold text-white">{name}</span></p>
          </div>
          <h1 className="cine-rise cine-rise-1 cine-title mt-4">{t.name}</h1>
          <div className="cine-rise cine-rise-2 mt-4 flex flex-wrap gap-2">
            <span className="cine-chip"><Clock className="h-3.5 w-3.5" />{t.duration_min} min</span>
            {t.location && <span className="cine-chip"><MapPin className="h-3.5 w-3.5" />{t.location}</span>}
          </div>
          {t.description && <p className="cine-rise cine-rise-3 mt-4 max-w-2xl text-base text-zinc-300 sm:text-lg">{t.description}</p>}
        </div>
      </header>
      <main className="relative mx-auto -mt-10 max-w-5xl px-3 pb-16 sm:px-5">
        <div className="cine-glass cine-rise cine-rise-2 rounded-3xl p-4 sm:p-8">
          <SlotPicker handle={o.handle} type={t.slug} typeName={t.name} ownerName={name} location={t.location} slots={slots} demo={demo} emailOn={emailConfigured()} />
        </div>
      </main>
      {!embed && <MadeWith tool="booking" />}
    </div>
    </>
  )
}
