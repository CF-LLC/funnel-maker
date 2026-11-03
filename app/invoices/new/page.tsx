import { InvoiceEditor } from '@/components/invoices/invoice-editor'
import { loadPickerClients } from '@/lib/clients/picker'
export const dynamic = 'force-dynamic'
export default async function NewInvoicePage() { return <InvoiceEditor crmClients={await loadPickerClients()} /> }
