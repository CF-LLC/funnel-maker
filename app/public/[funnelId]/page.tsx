import { FunnelView } from '@/components/funnel/funnel-view'
import { DemoBanner } from '@/components/demo-banner'
import { isDemoFunnel } from '@/lib/server/demo-funnel'

export const dynamic = 'force-dynamic'

// Legacy public URL by funnel id. Renders the same view (and Starter Sites footer) as /f/[slug].
export default async function PublicFunnelPage({ params }: { params: Promise<{ funnelId: string }> }) {
  const { funnelId } = await params
  const demo = await isDemoFunnel({ id: funnelId })
  return <>{demo && <DemoBanner />}<FunnelView id={funnelId} mode="main" /></>
}
