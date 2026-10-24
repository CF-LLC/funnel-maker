import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getReviewOwner } from '@/lib/testimonials/public'
import { ReviewForm } from '@/components/testimonials/review-form'
import { DemoBanner } from '@/components/demo-banner'
import { isDemoUser } from '@/lib/demo'

export const dynamic = 'force-dynamic'
type P = { params: Promise<{ handle: string }> }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const o = await getReviewOwner((await params).handle)
  return o ? { title: `Review ${o.display_name || '@' + o.handle}`, robots: { index: false } } : { title: 'This page is unavailable.', robots: { index: false } }
}

export default async function LeaveReviewPage({ params }: P) {
  const o = await getReviewOwner((await params).handle)
  if (!o) notFound()
  const demo = isDemoUser(o.user_id)
  return (
    <>{demo && <DemoBanner />}
    <div className="min-h-screen bg-app flex flex-col items-center px-4 py-12">
      <main className="mx-auto w-full max-w-lg space-y-4 rounded-xl border bg-background p-6">
        <h1 className="text-2xl font-bold">Leave a review for {o.display_name || `@${o.handle}`}</h1>
        {o.accepting ? <ReviewForm handle={o.handle} demo={demo} /> : <p className="text-muted-foreground">This page isn&apos;t taking reviews right now.</p>}
      </main>
      <footer className="mt-12 text-xs text-muted-foreground"><Link href="/pricing" className="hover:underline">Made with SaaS Nation</Link></footer>
    </div>
    </>
  )
}
