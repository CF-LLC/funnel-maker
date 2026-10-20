'use client'
import { SimpleCrud } from '@/components/invoices/simple-crud'
import { formatCurrency } from '@/lib/invoices/core'
export default function ItemsPage() {
  return <SimpleCrud table="inv_items" title="Item"
    fields={[{ key: 'description', label: 'Description (e.g. 4-lesson package)', required: true }, { key: 'unit_price_cents', label: 'Price', type: 'money', required: true }]}
    display={(r) => <div className="flex justify-between gap-2"><span className="truncate">{r.description}</span><span className="font-mono">{formatCurrency(Number(r.unit_price_cents))}</span></div>} />
}
