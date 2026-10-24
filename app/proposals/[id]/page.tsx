import { notFound } from 'next/navigation'
import { ProposalEditor } from '@/components/proposals/proposal-editor'
import { UUID_RE } from '@/lib/proposals/core'
export default async function EditProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()
  return <ProposalEditor id={id} />
}
