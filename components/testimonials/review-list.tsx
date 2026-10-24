import Link from 'next/link'
import type { PublicReview } from '@/lib/testimonials/public'
import { reviewWallPath, stars } from '@/lib/testimonials/core'

function Person({ r }: { r: PublicReview }) {
  return (
    <div className="flex items-center gap-3">
      {r.photo
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={r.photo} alt="" className="h-10 w-10 rounded-full object-cover border" loading="lazy" />
        : <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-semibold">{r.name.slice(0, 1).toUpperCase()}</span>}
      <div className="text-left">
        <p className="font-semibold leading-tight">{r.name}</p>
        {r.role && <p className="text-xs opacity-70">{r.role}</p>}
      </div>
    </div>
  )
}

/** Approved reviews as a grid or a single quote. Server-rendered; used on the wall, Link-in-bio, proposals and the funnel embed. */
export function ReviewList({ reviews, layout, handle, more = true }: { reviews: PublicReview[]; layout: 'grid' | 'quote'; handle?: string; more?: boolean }) {
  if (!reviews.length) return null
  if (layout === 'quote') {
    const r = reviews[0]
    return (
      <figure data-testimonials="quote" className="rounded-xl border bg-background/60 p-6 text-center text-foreground">
        <p aria-label={`${r.rating} out of 5 stars`} className="text-amber-500">{stars(r.rating)}</p>
        <blockquote className="mt-3 text-lg italic whitespace-pre-line">&ldquo;{r.body}&rdquo;</blockquote>
        <figcaption className="mt-4 flex justify-center"><Person r={r} /></figcaption>
      </figure>
    )
  }
  return (
    <div data-testimonials="grid" className="space-y-3">
      <ul className="grid gap-4 sm:grid-cols-2">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-xl border bg-background p-4 text-left text-foreground">
            <p aria-label={`${r.rating} out of 5 stars`} className="text-amber-500">{stars(r.rating)}</p>
            <p className="mt-2 whitespace-pre-line text-sm">{r.body}</p>
            <div className="mt-3"><Person r={r} /></div>
          </li>
        ))}
      </ul>
      {more && handle && <p className="text-center text-sm"><Link href={reviewWallPath(handle)} className="underline">See all reviews</Link></p>}
    </div>
  )
}
