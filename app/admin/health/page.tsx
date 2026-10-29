import { requireAdminPage } from '@/lib/admin/guard'
import { loadChurn, loadHealth } from '@/lib/admin/load3'
import { ALERTS_ENABLED } from '@/lib/admin/batch3'
import { HealthView } from '@/components/admin/batch3-views'

export const dynamic = 'force-dynamic'

export default async function AdminHealth() {
  await requireAdminPage('/admin/health')
  const [h, c] = await Promise.all([loadHealth(), loadChurn()])
  return <HealthView tools={h.tools} alerts={h.alerts} alertsEnabled={ALERTS_ENABLED} atRisk={c.atRisk} recentlyOff={c.recentlyOff} emailOf={c.emailOf} />
}
