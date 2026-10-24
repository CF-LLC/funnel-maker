'use client'

import { useEffect, useState } from 'react'
import { DemoBanner } from '@/components/demo-banner'
import { FunnelRenderer, type RenderFunnel } from '@/components/funnel/funnel-renderer'

export function FunnelView({ slug, id, mode }: { slug?: string; id?: string; mode: 'main' | 'thanks' }) {
  const [funnel, setFunnel] = useState<RenderFunnel | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(id ? `/api/public/funnels/${encodeURIComponent(id)}` : `/api/public/funnels/${encodeURIComponent(slug || '')}?bySlug=true`)
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(r.status === 404 ? 'This page is unavailable.' : d.error || 'Something went wrong')
        setFunnel(d.funnel)
      })
      .catch((e) => setError(e.message || 'This page is unavailable.'))
  }, [slug, id])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Page unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error === 'This page is unavailable.' ? 'This page isn\u2019t available right now.' : error}</p>
        </div>
      </div>
    )
  }
  if (!funnel) {
    // Skeleton with the same rough shape as a hero, so nothing jumps when content arrives.
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6" aria-busy="true" aria-label="Loading">
        <div className="skeleton h-12 w-4/5 max-w-xl rounded-xl" />
        <div className="skeleton h-5 w-3/5 max-w-md rounded-lg" />
        <div className="skeleton h-5 w-2/5 max-w-sm rounded-lg" />
        <div className="skeleton mt-4 h-14 w-56 rounded-2xl" />
      </div>
    )
  }
  return <div className="min-h-screen flex flex-col">{funnel.demo && <DemoBanner />}<FunnelRenderer funnel={funnel} mode={mode} /></div>
}
