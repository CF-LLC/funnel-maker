'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type U = { id: string; email: string; approved: boolean; approved_at: string | null; signup_template: string | null; plan: string | null; paid_until: string | null }

const PLAN_MONTHS: Record<string, number> = { monthly: 1, yearly: 12, founding: 12 }

function addMonths(months: number): string {
  const d = new Date()
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

export default function ApprovalsPage() {
  const [users, setUsers] = useState<U[] | null>(null)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<Record<string, { plan: string; paidUntil: string }>>({})

  const load = () =>
    fetch('/api/admin/approve').then(async (r) => {
      if (!r.ok) throw new Error(r.status === 403 || r.status === 404 ? 'Admins only' : 'Could not load')
      const list: U[] = (await r.json()).users
      setUsers(list)
      setDraft(Object.fromEntries(list.map((u) => [u.id, { plan: u.plan || '', paidUntil: u.paid_until || '' }])))
    }).catch((e) => setError(e.message))

  useEffect(() => { load() }, [])

  const post = async (body: Record<string, unknown>) => {
    const r = await fetch('/api/admin/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!r.ok) setError((await r.json().catch(() => ({}))).error || 'Update failed')
    load()
  }

  if (error) return <div className="text-red-600">{error}</div>
  if (!users) return <div>Loading…</div>
  return (
    <Card>
      <CardHeader><CardTitle>Accounts: approval and payment</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <p className="text-xs text-muted-foreground mb-3">
          After a Stripe payment arrives (check the Stripe dashboard; client_reference_id = user id), pick the plan and the paid-through date, then Save.
        </p>
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b"><th className="py-2">Email</th><th>Template</th><th>Approval</th><th>Plan</th><th>Paid through</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => {
              const d = draft[u.id] || { plan: '', paidUntil: '' }
              const setD = (patch: Partial<typeof d>) => setDraft({ ...draft, [u.id]: { ...d, ...patch } })
              return (
                <tr key={u.id} className="border-b align-middle">
                  <td className="py-2 pr-2">{u.email}</td>
                  <td className="pr-2">{u.signup_template || '—'}</td>
                  <td className="pr-2">
                    {u.approved
                      ? <Button size="sm" variant="outline" onClick={() => post({ userId: u.id, approved: false })}>Approved · Revoke</Button>
                      : <Button size="sm" onClick={() => post({ userId: u.id, approved: true })}>Approve</Button>}
                  </td>
                  <td className="pr-2">
                    <select aria-label="plan" className="border rounded px-2 py-1" value={d.plan}
                      onChange={(e) => setD({ plan: e.target.value, paidUntil: e.target.value ? addMonths(PLAN_MONTHS[e.target.value]) : '' })}>
                      <option value="">None</option>
                      <option value="monthly">Monthly $12</option>
                      <option value="yearly">Yearly $99</option>
                      <option value="founding">Founding $79</option>
                    </select>
                  </td>
                  <td className="pr-2"><input aria-label="paid until" type="date" className="border rounded px-2 py-1" value={d.paidUntil} onChange={(e) => setD({ paidUntil: e.target.value })} /></td>
                  <td className="text-right">
                    <Button size="sm" variant="secondary" onClick={() => post({ userId: u.id, plan: d.plan || null, paidUntil: d.paidUntil || null })}>Save</Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
