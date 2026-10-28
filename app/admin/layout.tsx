import { requireAdminPage } from '@/lib/admin/guard'
import { AdminShell } from '@/components/admin/shell'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const metadata = { title: 'Admin · SaaS Nation', robots: { index: false, follow: false, nocache: true } }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage()
  return <AdminShell>{children}</AdminShell>
}
