'use client'

import { use } from 'react'
import { FunnelView } from '@/components/funnel/funnel-view'

// Legacy public URL by funnel id. Renders the same view (and Starter Sites footer) as /f/[slug].
export default function PublicFunnelPage({ params }: { params: Promise<{ funnelId: string }> }) {
  const { funnelId } = use(params)
  return <FunnelView id={funnelId} mode="main" />
}
