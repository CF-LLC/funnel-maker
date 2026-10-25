import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getBookingOwner, openSlots } from '@/lib/booking/public'
import { bookPath } from '@/lib/booking/core'
import { DemoBanner } from '@/components/demo-banner'
import { SlotPicker } from '@/components/booking/slot-picker'
import { isDemoUser } from '@/lib/demo'

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
  return (
    <>{demo && <DemoBanner />}
    <div className={`min-h-screen bg-app flex flex-col items-center px-4 ${embed ? 'py-4' : 'py-12'}`}>
      <main className="mx-auto w-full max-w-2xl space-y-4 rounded-xl border bg-background p-4 sm:p-6">
        {!embed && <Link href={bookPath(o.handle)} className="text-sm text-muted-foreground hover:underline">← All meeting types</Link>}
        <div>
          <h1 className="text-2xl font-bold">{t.name}</h1>
          <p className="text-sm text-muted-foreground">{t.duration_min} min with {o.display_name || `@${o.handle}`}{t.location ? ` · ${t.location}` : ''}</p>
          {t.description && <p className="mt-2 text-sm">{t.description}</p>}
        </div>
        <SlotPicker handle={o.handle} type={t.slug} typeName={t.name} ownerName={o.display_name || `@${o.handle}`} location={t.location} slots={slots} demo={demo} />
      </main>
      {!embed && <footer className="mt-12 text-xs text-muted-foreground"><Link href="/pricing" className="hover:underline">Made with SaaS Nation</Link></footer>}
    </div>
    </>
  )
}
