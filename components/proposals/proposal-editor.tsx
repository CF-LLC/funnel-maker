'use client'
// Proposal editor: saved client, title, intro, line items, expiry. Accept/decline happens on the public page.
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency, toCents, totals } from '@/lib/invoices/core'
import { effectiveStatus, lineRows, nextInvoiceNumber, proposalSchema, proposalToInvoice, publicProposalPath, STATUS_LABELS, STATUS_STYLES } from '@/lib/proposals/core'

type L = { description: string; quantity: string; price: string }
type F = { clientId: string; title: string; intro: string; currency: string; expiresOn: string; lines: L[] }
const blankLine = (): L => ({ description: '', quantity: '1', price: '' })

export function ProposalEditor({ id }: { id?: string }) {
  const supabase = createClient() as any
  const router = useRouter()
  const [f, setF] = useState<F | null>(null)
  const [row, setRow] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [handle, setHandle] = useState<string | null>(null)
  const [newClient, setNewClient] = useState({ name: '', email: '' })
  const [errors, setErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const [{ data: c }, { data: it }, { data: lp }, { data: ip }] = await Promise.all([
        supabase.from('inv_clients').select('*').order('name'),
        supabase.from('inv_items').select('*').order('description'),
        supabase.from('lib_profiles').select('handle').eq('user_id', user?.id).maybeSingle(),
        supabase.from('inv_profiles').select('currency').maybeSingle(),
      ])
      setClients(c || []); setItems(it || []); setHandle(lp?.handle || null)
      if (!id) { setF({ clientId: '', title: '', intro: '', currency: ip?.currency || 'USD', expiresOn: '', lines: [blankLine()] }); return }
      const { data: p } = await supabase.from('prp_proposals').select('*, prp_proposal_lines(*)').eq('id', id).maybeSingle()
      if (!p) { setErrors(['Proposal not found']); return }
      const lines = [...p.prp_proposal_lines].sort((a: any, b: any) => a.position - b.position)
      setRow(p)
      setF({ clientId: p.client_id || '', title: p.title, intro: p.intro, currency: p.currency, expiresOn: p.expires_on || '',
        lines: lines.map((l: any) => ({ description: l.description, quantity: String(Number(l.quantity)), price: (Number(l.unit_price_cents) / 100).toFixed(2) })) })
    })() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const linesCents = useMemo(() => (f?.lines || []).map((l) => ({ quantity: Number(l.quantity) || 0, unit_price_cents: toCents(Number(l.price) || 0) })), [f])
  if (!f) return <p className="text-sm">{errors[0] || 'Loading…'}</p>
  const status = row ? effectiveStatus(row) : 'draft'
  const locked = row && (row.status === 'accepted' || row.status === 'declined')
  const cur = f.currency.length === 3 ? f.currency.toUpperCase() : 'USD'
  const set = <K extends keyof F>(k: K, v: F[K]) => setF({ ...f, [k]: v })
  const setLine = (i: number, patch: Partial<L>) => set('lines', f.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  const addSaved = (iid: string) => {
    const it = items.find((x) => x.id === iid); if (!it) return
    const lines = f.lines.length === 1 && !f.lines[0].description ? [] : f.lines
    set('lines', [...lines, { description: it.description, quantity: '1', price: (Number(it.unit_price_cents) / 100).toFixed(2) }])
  }

  async function addClient() {
    setErrors([])
    if (!newClient.name.trim()) return setErrors(['Client name is required'])
    const { data, error } = await supabase.from('inv_clients').insert({ name: newClient.name.trim(), email: newClient.email.trim() || null }).select('*').single()
    if (error) return setErrors(['Could not save client'])
    setClients([...clients, data].sort((a, b) => a.name.localeCompare(b.name))); setF((prev) => prev && { ...prev, clientId: data.id }); setNewClient({ name: '', email: '' })
  }

  async function save(nextStatus: 'draft' | 'sent') {
    setErrors([])
    const parsed = proposalSchema.safeParse(f)
    if (!parsed.success) return setErrors(parsed.error.issues.map((i) => i.message))
    const v = parsed.data
    const c = clients.find((x) => x.id === v.clientId)
    if (!c) return setErrors(['Pick a saved client'])
    setBusy(true)
    try {
      const data = { client_id: c.id, client_name: c.name, client_email: c.email || null, client_address: c.address || null, title: v.title, intro: v.intro,
        currency: v.currency, expires_on: v.expiresOn || null, status: nextStatus }
      let pid = id
      if (id) {
        const { error } = await supabase.from('prp_proposals').update(data).eq('id', id)
        if (error) throw new Error('Could not save proposal')
        const { error: de } = await supabase.from('prp_proposal_lines').delete().eq('proposal_id', id)
        if (de) throw new Error('Could not update line items')
      } else {
        const { data: ins, error } = await supabase.from('prp_proposals').insert(data).select('id').single()
        if (error) throw new Error('Could not save proposal')
        pid = ins.id
      }
      const { error: le } = await supabase.from('prp_proposal_lines').insert(lineRows(v.lines).map((l) => ({ ...l, proposal_id: pid })))
      if (le) throw new Error('Could not save line items')
      if (!id) router.push(`/proposals/${pid}`)
      else { setRow({ ...row, ...data }); router.refresh() }
      setErrors([nextStatus === 'sent' ? 'Saved and marked as sent. Share the public link with your client.' : 'Saved'])
    } catch (e: any) { setErrors([e.message]) } finally { setBusy(false) }
  }

  async function convert() {
    setErrors([]); setBusy(true)
    try {
      const [{ data: prof }, { count }] = await Promise.all([
        supabase.from('inv_profiles').select('*').maybeSingle(),
        supabase.from('inv_invoices').select('id', { count: 'exact', head: true }),
      ])
      let invId: string | null = null
      for (let attempt = 0; attempt < 5 && !invId; attempt++) {
        const { invoice } = proposalToInvoice(row, row.prp_proposal_lines, prof, nextInvoiceNumber(count || 0, attempt))
        const { data, error } = await supabase.from('inv_invoices').insert(invoice).select('id').single()
        if (data) invId = data.id
        else if (error?.code !== '23505') throw new Error(error?.code === '42501' ? 'Making an invoice needs Invoices (or All Access) on your plan.' : 'Could not create the invoice')
      }
      if (!invId) throw new Error('Could not pick an invoice number, try again')
      const { lines } = proposalToInvoice(row, row.prp_proposal_lines, prof, '')
      const { error: le } = await supabase.from('inv_invoice_lines').insert(lines.map((l) => ({ ...l, invoice_id: invId })))
      if (le) throw new Error('Invoice created but its line items failed; open it from Invoices to fix')
      const { error: ue } = await supabase.from('prp_proposals').update({ invoice_id: invId }).eq('id', row.id)
      if (ue) throw new Error('Invoice created, but linking it to the proposal failed')
      router.push(`/invoices/${invId}`)
    } catch (e: any) { setErrors([e.message]) } finally { setBusy(false) }
  }

  const t = totals(linesCents, null)
  const inp = (k: 'title' | 'currency' | 'expiresOn', label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block text-sm"><span className="font-medium">{label}</span><Input className="mt-1" disabled={!!locked} value={f[k]} onChange={(e) => set(k, e.target.value)} {...props} /></label>)

  return (
    <div className="space-y-4 rounded-xl border bg-background p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold">{id ? 'Proposal' : 'New proposal'}</h1>
        <span className={`rounded-full px-2 text-xs ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</span>
        {row && row.status !== 'draft' && handle && <a href={publicProposalPath(handle, row.id)} target="_blank" className="text-sm text-primary hover:underline">saasnation.site{publicProposalPath(handle, row.id)} ↗</a>}
      </div>
      {!handle && <p className="rounded-lg border border-amber-400 bg-amber-50 p-2 text-sm text-amber-900">Set a handle in <Link href="/links" className="underline">Link-in-bio</Link> to share proposals.</p>}
      {row?.status === 'accepted' && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-900">
          Accepted by <b>{row.accepted_name}</b> on {new Date(row.responded_at).toLocaleString('en-US', { timeZone: 'America/Chicago' })} (Central).
          <div className="mt-2">{row.invoice_id
            ? <Link href={`/invoices/${row.invoice_id}`} className="font-semibold underline">Open the invoice</Link>
            : <Button size="sm" onClick={convert} disabled={busy}>{busy ? 'Creating…' : 'Convert to invoice'}</Button>}</div>
        </div>)}
      {row?.status === 'declined' && <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">Declined on {new Date(row.responded_at).toLocaleString('en-US', { timeZone: 'America/Chicago' })} (Central).</p>}
      <fieldset className="space-y-2 rounded-lg border p-3" disabled={!!locked}>
        <legend className="px-1 text-sm font-semibold">Client</legend>
        <select aria-label="Saved client" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={f.clientId} onChange={(e) => set('clientId', e.target.value)}>
          <option value="">— Pick a saved client —</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.email ? ` (${c.email})` : ''}</option>)}</select>
        {!locked && <div className="flex flex-wrap items-end gap-2 text-sm">
          <Input className="flex-1 min-w-[8rem]" aria-label="New client name" placeholder="New client name" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
          <Input className="flex-1 min-w-[8rem]" aria-label="New client email" type="email" placeholder="Email (optional)" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
          <Button type="button" variant="outline" size="sm" onClick={addClient}>Save client</Button></div>}
      </fieldset>
      {inp('title', 'Title', { maxLength: 150, placeholder: 'e.g. Spring coaching package' })}
      <label className="block text-sm"><span className="font-medium">Intro</span><textarea className="mt-1 w-full rounded-md border bg-background px-3 py-2" rows={4} maxLength={2000} disabled={!!locked} value={f.intro} onChange={(e) => set('intro', e.target.value)} placeholder="A short note about the work and what's included" /></label>
      <fieldset className="space-y-2 rounded-lg border p-3" disabled={!!locked}>
        <legend className="px-1 text-sm font-semibold">Line items</legend>
        {f.lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_70px_100px_auto] gap-2 items-end">
            <Input aria-label={`Description ${i + 1}`} placeholder="Description" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
            <Input aria-label={`Quantity ${i + 1}`} inputMode="decimal" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
            <Input aria-label={`Price ${i + 1}`} inputMode="decimal" placeholder="0.00" value={l.price} onChange={(e) => setLine(i, { price: e.target.value })} />
            <Button type="button" variant="ghost" size="icon" aria-label="Remove line" disabled={f.lines.length === 1} onClick={() => set('lines', f.lines.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
          </div>))}
        {!locked && <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => set('lines', [...f.lines, blankLine()])}><Plus className="h-4 w-4 mr-1" />Add line</Button>
          {items.length > 0 && <select aria-label="Add saved item" className="rounded-md border bg-background px-2 text-sm" value="" onChange={(e) => addSaved(e.target.value)}>
            <option value="">+ Saved item…</option>{items.map((it) => <option key={it.id} value={it.id}>{it.description} ({formatCurrency(Number(it.unit_price_cents), cur)})</option>)}</select>}
        </div>}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">{inp('expiresOn', 'Expires on (optional)', { type: 'date' })}{inp('currency', 'Currency', { maxLength: 3 })}</div>
      {errors.length > 0 && <ul className="text-sm" role="status">{errors.map((e, i) => <li key={i} className={/^Saved/.test(e) ? 'text-green-700' : 'text-red-600'}>{e}</li>)}</ul>}
      <div className="flex flex-wrap items-center gap-3">
        {!locked && <>
          <Button variant="outline" onClick={() => save('draft')} disabled={busy}>{row?.status === 'sent' ? 'Move back to draft' : 'Save draft'}</Button>
          <Button onClick={() => save('sent')} disabled={busy}>{row?.status === 'sent' ? 'Save changes' : 'Save and mark as sent'}</Button>
        </>}
        <span className="ml-auto text-sm font-semibold">Total {formatCurrency(t.total, cur)}</span>
      </div>
    </div>
  )
}
