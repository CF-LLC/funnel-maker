'use client'
import { SimpleCrud } from '@/components/invoices/simple-crud'
export default function ClientsPage() {
  return <SimpleCrud table="inv_clients" title="Client"
    fields={[{ key: 'name', label: 'Name', required: true }, { key: 'email', label: 'Email', type: 'email' }, { key: 'address', label: 'Address', type: 'textarea' }]}
    display={(r) => <><div className="font-medium truncate">{r.name}</div><div className="text-muted-foreground truncate">{r.email || ''}</div></>} />
}
