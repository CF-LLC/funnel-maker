import { ProposalEditor } from '@/components/proposals/proposal-editor'
import { loadPickerClients } from '@/lib/clients/picker'
export const dynamic = 'force-dynamic'
export default async function NewProposalPage() { return <ProposalEditor crmClients={await loadPickerClients()} /> }
