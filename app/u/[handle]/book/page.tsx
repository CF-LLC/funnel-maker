import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getBookingOwner } from '@/lib/booking/public'
import { bookPath } from '@/lib/booking/core'
import { DemoBanner } from '@/components/demo-banner'
import { isDemoUser } from '@/lib/demo'

export const dynamic = 'force-dynamic'
type P = { params: Promise<{ handle: string }> }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const o = await getBookingOwner((await params).handle)
  return o ? { title: `Book time with ${o.display_name || '@' + o.handle}` } : { title: 'This page is unavailable.', robots: { index: false } }
}

export default async function BookIndex({ params }: P) {
  const o = await getBookingOwner((await params).handle)
  if (!o) notFound()
  return (
    <>{isDemoUser(o.user_id) && <DemoBanner />}
    <div className="min-h-screen bg-app flex flex-col items-center px-4 py-12">
      <main className="mx-auto w-full max-w-lg space-y-4">
        <h1 className="text-2xl font-bold">Book time with {o.display_name || `@${o.handle}`}</h1>
        {o.types.length === 0 ? <p className="text-muted-foreground">No meeting types are open right now.</p> : (
          <ul className="space-y-3">
            {o.types.map((t) => (
              <li key={t.id}>
                <Link href={bookPath(o.handle, t.slug)} className="block rounded-xl border bg-background p-4 hover:border-foreground">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-muted-foreground">{t.duration_min} min{t.location ? ` · ${t.location}` : ''}</div>
                  {t.description && <p className="mt-1 text-sm">{t.description}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <footer className="mt-12 text-xs text-muted-foreground"><Link href="/pricing" className="hover:underline">Made with SaaS Nation</Link></footer>
    </div>
    </>
  )
}
