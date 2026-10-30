import { notFound } from 'next/navigation'
import { isUuid } from '@/lib/reports/core'
import { ClientWorkspace } from '@/components/reports/workspace'
export default async function ClientReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) notFound()
  return <ClientWorkspace id={id} />
}
