import { notFound } from 'next/navigation'
import { InvoiceEditor } from '@/components/invoices/invoice-editor'
export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  return <InvoiceEditor id={id} />
}
