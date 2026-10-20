'use client'
// Form + line items + live preview, adapted from CF-LLC/InvoiceForge invoice-form.tsx, now persisted to Supabase.
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InvoicePreview } from './invoice-preview'
import { addDaysISO, formatCurrency, invoiceSchema, toCents, todayISO, totals } from '@/lib/invoices/core'

type L = { description: string; quantity: string; price: string }
type F = {
  number: string; issueDate: string; dueDate: string; clientId: string | null; clientName: string; clientEmail: string; clientAddress: string
  sellerName: string; sellerEmail: string; sellerAddress: string; currency: string; taxRate: string; notes: string; payLink: string; lines: L[]
}
const blankLine = (): L => ({ description: '', quantity: '1', price: '' })

export function InvoiceEditor({ id }: { id?: string }) {
  const supabase = createClient() as any
  const router = useRouter()
  const [f, setF] = useState<F | null>(null)
  const [clients, setClients] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [saveClient, setSaveClient] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: it }, { data: p }] = await Promise.all([
        supabase.from('inv_clients').select('*').order('name'),
        supabase.from('inv_items').select('*').order('description'),
        supabase.from('inv_profiles').select('*').maybeSingle(),
      ])
      setClients(c || []); setItems(it || [])
      if (id) {
        const { data: inv } = await supabase.from('inv_invoices').select('*, inv_invoice_lines(*)').eq('id', id).maybeSingle()
        if (!inv) { setErrors(['Invoice not found']); return }
        const lines = [...inv.inv_invoice_lines].sort((a: any, b: any) => a.position - b.position)
        setF({ number: inv.number, issueDate: inv.issue_date, dueDate: inv.due_date, clientId: inv.client_id, clientName: inv.client_name, clientEmail: inv.client_email || '',
          clientAddress: inv.client_address || '', sellerName: inv.seller_name, sellerEmail: inv.seller_email, sellerAddress: inv.seller_address, currency: inv.currency,
          taxRate: inv.tax_rate === null ? '' : String(Number(inv.tax_rate)), notes: inv.notes || '', payLink: inv.pay_link || '',
          lines: lines.map((l: any) => ({ description: l.description, quantity: String(Number(l.quantity)), price: (Number(l.unit_price_cents) / 100).toFixed(2) })) })
      } else {
        const { count } = await supabase.from('inv_invoices').select('id', { count: 'exact', head: true })
        const t = todayISO()
        setF({ number: `INV-${String((count || 0) + 1).padStart(4, '0')}`, issueDate: t, dueDate: addDaysISO(t, 14), clientId: null, clientName: '', clientEmail: '', clientAddress: '',
          sellerName: p?.business_name || '', sellerEmail: p?.business_email || '', sellerAddress: p?.business_address || '', currency: p?.currency || 'USD',
          taxRate: '', notes: '', payLink: p?.pay_link || '', lines: [blankLine()] })
      }
    })() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const linesCents = useMemo(() => (f?.lines || []).map((l) => ({ description: l.description, quantity: Number(l.quantity) || 0, unit_price_cents: toCents(Number(l.price) || 0) })), [f])
  if (!f) return <p className="text-sm">{errors[0] || 'Loading…'}</p>
  const set = <K extends keyof F>(k: K, v: F[K]) => setF({ ...f, [k]: v })
  const setLine = (i: number, patch: Partial<L>) => set('lines', f.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  const tax = f.taxRate === '' ? null : Number(f.taxRate)
  const t = totals(linesCents, tax)

  const pickClient = (cid: string) => {
    const c = clients.find((x) => x.id === cid)
    setF({ ...f, clientId: c?.id ?? null, clientName: c?.name ?? f.clientName, clientEmail: c?.email ?? '', clientAddress: c?.address ?? '' })
  }
  const addSaved = (iid: string) => {
    const it = items.find((x) => x.id === iid); if (!it) return
    const lines = f.lines.length === 1 && !f.lines[0].description ? [] : f.lines
    set('lines', [...lines, { description: it.description, quantity: '1', price: (Number(it.unit_price_cents) / 100).toFixed(2) }])
  }

  const save = async () => {
    setErrors([])
    const parsed = invoiceSchema.safeParse(f)
    if (!parsed.success) { setErrors(parsed.error.issues.map((i) => i.message)); return }
    const v = parsed.data
    setSaving(true)
    try {
      let clientId = v.clientId ?? null
      if (!clientId && saveClient) {
        const { data, error } = await supabase.from('inv_clients').insert({ name: v.clientName, email: v.clientEmail || null, address: v.clientAddress || null }).select('id').single()
        if (error) throw new Error('Could not save client'); clientId = data.id
      }
      const row = { number: v.number, issue_date: v.issueDate, due_date: v.dueDate, client_id: clientId, client_name: v.clientName, client_email: v.clientEmail || null,
        client_address: v.clientAddress || null, seller_name: v.sellerName || '', seller_email: v.sellerEmail || '', seller_address: v.sellerAddress || '',
        currency: v.currency, tax_rate: v.taxRate === '' || v.taxRate === undefined ? null : v.taxRate, notes: v.notes || null, pay_link: v.payLink || null }
      let invId = id
      if (id) {
        const { error } = await supabase.from('inv_invoices').update(row).eq('id', id)
        if (error) throw new Error(error.code === '23505' ? 'That invoice number is already used' : 'Could not save invoice')
        const { error: de } = await supabase.from('inv_invoice_lines').delete().eq('invoice_id', id)
        if (de) throw new Error('Could not update line items')
      } else {
        const { data, error } = await supabase.from('inv_invoices').insert(row).select('id').single()
        if (error) throw new Error(error.code === '23505' ? 'That invoice number is already used' : 'Could not save invoice')
        invId = data.id
      }
      const { error: le } = await supabase.from('inv_invoice_lines').insert(v.lines.map((l, i) => ({ invoice_id: invId, position: i, description: l.description, quantity: l.quantity, unit_price_cents: toCents(l.price) })))
      if (le) throw new Error('Could not save line items')
      router.push(`/invoices?saved=${invId}`); router.refresh()
    } catch (e: any) { setErrors([e.message]) } finally { setSaving(false) }
  }

  const inp = (k: keyof F, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block text-sm"><span className="font-medium">{label}</span><Input className="mt-1" value={f[k] as string} onChange={(e) => set(k, e.target.value as any)} {...props} /></label>)

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-4 rounded-xl border bg-background p-4 sm:p-5">
        <h1 className="text-lg font-bold">{id ? 'Edit invoice' : 'New invoice'}</h1>
        <div className="grid gap-3 sm:grid-cols-3">{inp('number', 'Invoice #')}{inp('issueDate', 'Issued', { type: 'date' })}{inp('dueDate', 'Due', { type: 'date' })}</div>
        <fieldset className="space-y-2 rounded-lg border p-3">
          <legend className="px-1 text-sm font-semibold">Client</legend>
          {clients.length > 0 && <select aria-label="Saved client" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={f.clientId || ''} onChange={(e) => pickClient(e.target.value)}>
            <option value="">— New / one-off client —</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
          <div className="grid gap-3 sm:grid-cols-2">{inp('clientName', 'Name')}{inp('clientEmail', 'Email (optional)', { type: 'email' })}</div>
          <label className="block text-sm"><span className="font-medium">Address (optional)</span><textarea className="mt-1 w-full rounded-md border bg-background px-3 py-2" rows={2} value={f.clientAddress} onChange={(e) => set('clientAddress', e.target.value)} /></label>
          {!f.clientId && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={saveClient} onChange={(e) => setSaveClient(e.target.checked)} /> Save this client for next time</label>}
        </fieldset>
        <fieldset className="space-y-2 rounded-lg border p-3">
          <legend className="px-1 text-sm font-semibold">Line items</legend>
          {f.lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_70px_100px_auto] gap-2 items-end">
              <Input aria-label={`Description ${i + 1}`} placeholder="Description" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
              <Input aria-label={`Quantity ${i + 1}`} inputMode="decimal" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
              <Input aria-label={`Price ${i + 1}`} inputMode="decimal" placeholder="0.00" value={l.price} onChange={(e) => setLine(i, { price: e.target.value })} />
              <Button type="button" variant="ghost" size="icon" aria-label="Remove line" disabled={f.lines.length === 1} onClick={() => set('lines', f.lines.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>))}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => set('lines', [...f.lines, blankLine()])}><Plus className="h-4 w-4 mr-1" />Add line</Button>
            {items.length > 0 && <select aria-label="Add saved item" className="rounded-md border bg-background px-2 text-sm" value="" onChange={(e) => addSaved(e.target.value)}>
              <option value="">+ Saved item…</option>{items.map((it) => <option key={it.id} value={it.id}>{it.description} ({formatCurrency(Number(it.unit_price_cents), f.currency)})</option>)}</select>}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          {inp('taxRate', 'Tax rate % (optional)', { inputMode: 'decimal', placeholder: 'e.g. 9.5' })}
          {inp('currency', 'Currency', { maxLength: 3 })}
        </div>
        {inp('payLink', 'Stripe Payment Link for this invoice (optional)', { placeholder: 'https://buy.stripe.com/...' })}
        <label className="block text-sm"><span className="font-medium">Notes (optional)</span><textarea className="mt-1 w-full rounded-md border bg-background px-3 py-2" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="e.g. Payment 2 of 3 for the 12-lesson package" /></label>
        <details className="text-sm"><summary className="cursor-pointer font-medium">Your business details on this invoice</summary>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">{inp('sellerName', 'Business name')}{inp('sellerEmail', 'Business email', { type: 'email' })}</div>
          <label className="mt-2 block"><span className="font-medium">Address</span><textarea className="mt-1 w-full rounded-md border bg-background px-3 py-2" rows={2} value={f.sellerAddress} onChange={(e) => set('sellerAddress', e.target.value)} /></label>
        </details>
        {errors.length > 0 && <ul className="text-sm text-red-600" role="alert">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
        <div className="flex items-center gap-3"><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save invoice'}</Button>
          <span className="text-sm text-muted-foreground">Total {formatCurrency(t.total, f.currency.length === 3 ? f.currency.toUpperCase() : 'USD')}</span></div>
      </div>
      <div className="xl:sticky xl:top-20 h-fit">
        <InvoicePreview d={{ number: f.number, issue_date: f.issueDate, due_date: f.dueDate, currency: f.currency.length === 3 ? f.currency.toUpperCase() : 'USD', tax_rate: tax && tax > 0 ? tax : null,
          notes: f.notes, client_name: f.clientName || 'Client name', client_email: f.clientEmail, client_address: f.clientAddress, seller_name: f.sellerName, seller_email: f.sellerEmail,
          seller_address: f.sellerAddress, lines: linesCents }} />
      </div>
    </div>
  )
}
