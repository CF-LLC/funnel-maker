'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { formatCurrency, isOverdue, reminderIcs, reminderMailto, todayISO, totals } from '@/lib/invoices/core'
import { paidNote } from '@/lib/paid/core'

type Inv = { id: string; number: string; client_name: string; client_id: string | null; due_date: string; issue_date: string; status: 'paid' | 'unpaid'; currency: string; tax_rate: number | null; public_token: string; total: number }

export default function InvoicesHome() {
  const supabase = createClient() as any
  const [rows, setRows] = useState<Inv[] | null>(null)
  const [email, setEmail] = useState('')
  const [show, setShow] = useState<'unpaid' | 'paid' | 'all'>('unpaid')
  const [msg, setMsg] = useState('')
  const [viaPaid, setViaPaid] = useState<Record<string, string>>({})
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const load = async () => {
    const { data, error } = await supabase.from('inv_invoices')
      .select('id, number, client_name, client_id, due_date, issue_date, status, currency, tax_rate, public_token, inv_invoice_lines(quantity, unit_price_cents)')
      .order('due_date', { ascending: true }).limit(1000)
    if (error) { setMsg('Could not load invoices'); setRows([]); return }
    // Invoices marked paid from Paid? (bank CSV matching) show a small note; no access needed to read your own matches.
    const { data: pm } = await supabase.from('pd_matches').select('invoice_id, paid_on, note').is('undone_at', null).limit(1000)
    setViaPaid(Object.fromEntries((pm || []).map((m: any) => [m.invoice_id, `${paidNote(m.paid_on)}${m.note ? ` · ${m.note}` : ''}`])))
    setRows((data || []).map((r: any) => ({ ...r, total: totals(r.inv_invoice_lines.map((l: any) => ({ quantity: Number(l.quantity), unit_price_cents: Number(l.unit_price_cents) })), r.tax_rate === null ? null : Number(r.tax_rate)).total })))
  }
  useEffect(() => {
    load()
    ;(async () => {
      const { data: p } = await supabase.from('inv_profiles').select('business_email').maybeSingle()
      const { data: { user } } = await supabase.auth.getUser()
      setEmail(p?.business_email || user?.email || '')
    })() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const today = todayISO()
  const owes = useMemo(() => {
    const m = new Map<string, { name: string; currency: string; total: number; overdue: number; count: number }>()
    for (const r of rows || []) {
      if (r.status !== 'unpaid') continue
      const k = `${r.client_id || r.client_name.toLowerCase()}|${r.currency}`
      const e = m.get(k) || { name: r.client_name, currency: r.currency, total: 0, overdue: 0, count: 0 }
      e.total += r.total; e.count++; if (isOverdue(r, today)) e.overdue += r.total
      m.set(k, e)
    }
    return [...m.values()].sort((a, b) => b.overdue - a.overdue || b.total - a.total)
  }, [rows, today])

  const toggle = async (r: Inv) => {
    const status = r.status === 'paid' ? 'unpaid' : 'paid'
    const { error } = await supabase.from('inv_invoices').update({ status, paid_at: status === 'paid' ? new Date().toISOString() : null }).eq('id', r.id)
    if (error) setMsg('Could not update status'); load()
  }
  const link = (r: Inv) => `${origin}/i/${r.public_token}`
  const copy = async (r: Inv) => { await navigator.clipboard.writeText(link(r)).catch(() => {}); setMsg(`Copied link for ${r.number}`) }
  const ics = (r: Inv) => {
    const body = reminderIcs({ uid: r.id, number: r.number, clientName: r.client_name, amount: formatCurrency(r.total, r.currency), dueDate: r.due_date, link: link(r) })
    const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar' }))
    const a = document.createElement('a'); a.href = url; a.download = `invoice-${r.number}-due.ics`; a.click(); URL.revokeObjectURL(url)
  }

  const list = (rows || []).filter((r) => show === 'all' || r.status === show)
  const sumUnpaid = owes.reduce((s, o) => s + (o.currency === 'USD' ? o.total : 0), 0)
  const sumOverdue = owes.reduce((s, o) => s + (o.currency === 'USD' ? o.overdue : 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Who owes what</h1>
          <p className="text-sm text-muted-foreground">Outstanding {formatCurrency(sumUnpaid)} · <span className={sumOverdue ? 'text-red-600 font-medium' : ''}>Overdue {formatCurrency(sumOverdue)}</span></p></div>
        <Link href="/invoices/new"><Button>New invoice</Button></Link>
      </div>
      {msg && <p className="text-sm" role="status">{msg}</p>}
      {owes.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {owes.map((o) => (
            <div key={o.name + o.currency} className={`rounded-xl border bg-background p-4 ${o.overdue ? 'border-red-300' : ''}`}>
              <div className="font-semibold truncate">{o.name}</div>
              <div className="text-xl font-bold">{formatCurrency(o.total, o.currency)}</div>
              <div className="text-xs text-muted-foreground">{o.count} unpaid{o.overdue ? <span className="ml-1 font-semibold text-red-600">· {formatCurrency(o.overdue, o.currency)} overdue</span> : null}</div>
            </div>))}
        </div>)}
      <div className="rounded-xl border bg-background">
        <div className="flex gap-1 border-b p-2 text-sm">{(['unpaid', 'paid', 'all'] as const).map((s) =>
          <Button key={s} size="sm" variant={show === s ? 'default' : 'ghost'} onClick={() => setShow(s)}>{s[0].toUpperCase() + s.slice(1)}</Button>)}</div>
        {rows === null ? <p className="p-4 text-sm">Loading…</p> : list.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No invoices here yet. <Link className="underline" href="/invoices/new">Create one</Link>.</p> :
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="p-3">Invoice</th><th className="hidden sm:table-cell">Client</th><th>Due</th><th className="text-right">Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>{list.map((r) => {
              const od = isOverdue(r, today)
              return (
                <tr key={r.id} className="border-b last:border-0 align-middle">
                  <td className="p-3 font-mono whitespace-nowrap"><Link className="underline" href={`/invoices/${r.id}`}>{r.number}</Link></td>
                  <td className="pr-2 hidden sm:table-cell">{r.client_name}</td>
                  <td className="pr-2 whitespace-nowrap">{r.due_date}{od && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">Overdue</span>}</td>
                  <td className="pr-2 text-right font-medium">{formatCurrency(r.total, r.currency)}</td>
                  <td className="pr-2"><button onClick={() => toggle(r)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${r.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`} title="Toggle paid/unpaid">{r.status === 'paid' ? 'Paid' : 'Unpaid'}</button>{r.status === 'paid' && viaPaid[r.id] && <div className="mt-1 text-[11px] text-muted-foreground" data-testid="via-paid">{viaPaid[r.id]}</div>}</td>
                  <td className="p-2 text-right whitespace-nowrap space-x-1">
                    <a className="inline-block rounded-md border px-2 py-1 text-xs hover:bg-muted" href={`/i/${r.public_token}`} target="_blank" rel="noopener">View</a>
                    <a className="inline-block rounded-md border px-2 py-1 text-xs hover:bg-muted" href={`/i/${r.public_token}/pdf`}>PDF</a>
                    <button className="rounded-md border px-2 py-1 text-xs hover:bg-muted" onClick={() => copy(r)}>Copy link</button>
                    {r.status === 'unpaid' && <>
                      <a className="inline-block rounded-md border px-2 py-1 text-xs hover:bg-muted" title={`Opens an email to ${email}`}
                        href={reminderMailto({ to: email, number: r.number, clientName: r.client_name, amount: formatCurrency(r.total, r.currency), dueDate: r.due_date, link: link(r) })}>Remind me</a>
                      <button className="rounded-md border px-2 py-1 text-xs hover:bg-muted" onClick={() => ics(r)}>.ics</button>
                    </>}
                  </td>
                </tr>)
            })}</tbody>
          </table></div>}
      </div>
    </div>
  )
}
