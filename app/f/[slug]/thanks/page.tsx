import { FunnelView } from '@/components/funnel/funnel-view'
import { DemoBanner } from '@/components/demo-banner'
import { isDemoFunnel } from '@/lib/server/demo-funnel'

export const dynamic = 'force-dynamic'

// Thank-you page. Also the "after payment" URL to set on the seller's Stripe Payment Link.
export default async function FunnelThanksPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const demo = await isDemoFunnel({ slug })
  return <>{demo && <DemoBanner />}<FunnelView slug={slug} mode="thanks" /></>
}
