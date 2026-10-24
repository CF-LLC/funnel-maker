import { FunnelView } from '@/components/funnel/funnel-view'
import { DemoBanner } from '@/components/demo-banner'
import { isDemoFunnel } from '@/lib/server/demo-funnel'

export const dynamic = 'force-dynamic'

export default async function SlugFunnelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const demo = await isDemoFunnel({ slug })
  return <>{demo && <DemoBanner />}<FunnelView slug={slug} mode="main" /></>
}
