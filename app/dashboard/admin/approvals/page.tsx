'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type U = { id: string; email: string; approved: boolean; approved_at: string | null; signup_template: string | null }

export default function ApprovalsPage() {
  const [users, setUsers] = useState<U[] | null>(null)
  const [error, setError] = useState('')

  const load = () =>
    fetch('/api/admin/approve').then(async (r) => {
      if (!r.ok) throw new Error(r.status === 403 ? 'Admins only' : 'Could not load')
      setUsers((await r.json()).users)
    }).catch((e) => setError(e.message))

  useEffect(() => { load() }, [])

  const set = async (userId: string, approved: boolean) => {
    const r = await fetch('/api/admin/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, approved }) })
    if (!r.ok) setError('Update failed')
    load()
  }

  if (error) return <div className="text-red-600">{error}</div>
  if (!users) return <div>Loading…</div>
  return (
    <Card>
      <CardHeader><CardTitle>Account approvals</CardTitle></CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b"><th className="py-2">Email</th><th>Template</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="py-2">{u.email}</td>
                <td>{u.signup_template || '—'}</td>
                <td>{u.approved ? `Approved ${u.approved_at ? new Date(u.approved_at).toLocaleDateString() : ''}` : 'Pending'}</td>
                <td className="text-right">
                  {u.approved
                    ? <Button size="sm" variant="outline" onClick={() => set(u.id, false)}>Revoke</Button>
                    : <Button size="sm" onClick={() => set(u.id, true)}>Approve</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
