'use client'

import { use } from 'react'
import { FunnelView } from '@/components/funnel/funnel-view'

export default function SlugFunnelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  return <FunnelView slug={slug} mode="main" />
}
