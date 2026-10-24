import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getApprovedReviews, getReviewOwner } from '@/lib/testimonials/public'
import { reviewFormPath } from '@/lib/testimonials/core'
import { ReviewList } from '@/components/testimonials/review-list'

export const dynamic = 'force-dynamic'
type P = { params: Promise<{ handle: string }>; searchParams: Promise<{ embed?: string; layout?: string }> }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const o = await getReviewOwner((await params).handle)
  return o ? { title: `Reviews for ${o.display_name || '@' + o.handle}` } : { title: 'This page is unavailable.', robots: { index: false } }
}

/** Public wall of approved reviews. ?embed=1&layout=grid|quote renders a bare version for funnel iframes. */
export default async function ReviewWall({ params, searchParams }: P) {
  const [{ handle }, sp] = await Promise.all([params, searchParams])
  const o = await getReviewOwner(handle)
  if (!o) notFound()
  const embed = sp.embed === '1'
  const layout = sp.layout === 'quote' ? 'quote' : 'grid'
  const reviews = await getApprovedReviews(o.user_id, embed ? (layout === 'quote' ? 1 : 6) : 60)
  if (embed) return <div className="bg-white p-2"><ReviewList reviews={reviews} layout={layout} handle={o.handle} more={false} /></div>
  return (
    <div className="min-h-screen bg-app flex flex-col items-center px-4 py-12">
      <main className="mx-auto w-full max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Reviews for {o.display_name || `@${o.handle}`}</h1>
          {o.accepting && <p className="mt-2 text-sm"><Link href={reviewFormPath(o.handle)} className="underline">Leave a review</Link></p>}
        </div>
        {reviews.length ? <ReviewList reviews={reviews} layout="grid" handle={o.handle} more={false} /> : <p className="text-center text-muted-foreground">No reviews yet.</p>}
      </main>
      <footer className="mt-12 text-xs text-muted-foreground"><Link href="/pricing" className="hover:underline">Made with SaaS Nation</Link></footer>
    </div>
  )
}
