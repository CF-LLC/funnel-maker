'use client'

import { use } from 'react'
import { FunnelView } from '@/components/funnel/funnel-view'

// Thank-you page. Also the "after payment" URL to set on the seller's Stripe Payment Link.
export default function FunnelThanksPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  return <FunnelView slug={slug} mode="thanks" />
}
