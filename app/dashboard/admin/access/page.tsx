'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type U = { id: string; email: string; approved: boolean; plan: string | null; wish_tool: string | null }
type A = { user_id: string; tool: 'funnels' | 'invoices'; plan: string | null; source: string; active: boolean; founding_lapsed: boolean; created_at: string }
const TOOLS = ['funnels', 'invoices'] as const
type Filter = 'all' | 'active' | 'inactive' | 'none'

export default function AccessPage() {
  const [users, setUsers] = useState<U[] | null>(null)
  const [access, setAccess] = useState<A[]>([])
  const [error, setError] = useState('')
  const [tool, setTool] = useState<(typeof TOOLS)[number]>('funnels')
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')

  const load = () => fetch('/api/admin/access').then(async (r) => {
    if (!r.ok) throw new Error(r.status === 403 ? 'Admins only' : 'Could not load')
    const j = await r.json(); setUsers(j.users); setAccess(j.access)
  }).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const post = async (body: Record<string, unknown>) => {
    setError('')
    const r = await fetch('/api/admin/access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!r.ok) setError((await r.json().catch(() => ({}))).error || 'Update failed')
    load()
  }

  const row = (uid: string, t: string) => access.find((a) => a.user_id === uid && a.tool === t)
  const list = useMemo(() => (users || []).filter((u) => {
    if (q && !u.email.toLowerCase().includes(q.toLowerCase())) return false
    const a = row(u.id, tool)
    if (filter === 'active') return !!a?.active
    if (filter === 'inactive') return !!a && !a.active
    if (filter === 'none') return !a
    return true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [users, access, tool, filter, q])

  if (!users && !error) return <div>Loading…</div>
  const wishes = (users || []).filter((u) => u.wish_tool)
  return (
    <div className="space-y-6">
      {error && <div className="text-red-600 text-sm" role="alert">{error}</div>}
      <Card>
        <CardHeader><CardTitle>Tool access</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto space-y-3">
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <b>Founding invoices access</b> is included only while the user&apos;s <b>funnels</b> access stays active.
            If funnels access is turned off, founding invoices access turns off too and is marked <b>lapsed</b> permanently;
            re-subscribing to funnels does not restore it. After a lapse, grant invoices as <b>single</b> ($12) or <b>all_access</b> instead.
            Approving an account on the Approvals page grants funnels access (and founding invoices while INVOICES_FOUNDING_OPEN isn&apos;t &quot;false&quot;).
          </div>
          <div className="flex flex-wrap gap-2 items-center text-sm">
            {TOOLS.map((t) => <Button key={t} size="sm" variant={tool === t ? 'default' : 'outline'} onClick={() => setTool(t)}>{t}</Button>)}
            <select aria-label="filter" className="border rounded px-2 py-1" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
              <option value="all">All users</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="none">No access row</option>
            </select>
            <input aria-label="search" placeholder="Search email" className="border rounded px-2 py-1" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-left border-b"><th className="py-2">Email</th><th>Status</th><th>Source</th><th>Plan</th><th>Since</th><th></th></tr></thead>
            <tbody>
              {list.map((u) => {
                const a = row(u.id, tool)
                const fundsActive = !!row(u.id, 'funnels')?.active
                return (
                  <tr key={u.id} className="border-b align-middle">
                    <td className="py-2 pr-2">{u.email}</td>
                    <td className="pr-2">{a ? (a.active ? <span className="text-green-700">Active</span> : <span className="text-muted-foreground">Inactive</span>) : '—'}
                      {a?.founding_lapsed && <span className="ml-1 text-xs text-amber-700">(founding lapsed)</span>}</td>
                    <td className="pr-2">{a?.source || '—'}{tool === 'invoices' && a?.source === 'founding' && a.active && <span className="block text-xs text-muted-foreground">while funnels active</span>}</td>
                    <td className="pr-2">{a?.plan || '—'}</td>
                    <td className="pr-2">{a ? new Date(a.created_at).toLocaleDateString() : '—'}</td>
                    <td className="text-right space-x-1 whitespace-nowrap">
                      {a?.active
                        ? <Button size="sm" variant="outline" onClick={() => post({ userId: u.id, tool, active: false })}>Deactivate</Button>
                        : <>
                            <Button size="sm" onClick={() => post({ userId: u.id, tool, active: true, source: 'single' })}>Approve (single)</Button>
                            <Button size="sm" variant="secondary" onClick={() => post({ userId: u.id, tool, active: true, source: 'all_access' })}>All access</Button>
                            {tool === 'invoices' && !a?.founding_lapsed && fundsActive &&
                              <Button size="sm" variant="ghost" onClick={() => post({ userId: u.id, tool, active: true, source: 'founding' })}>Founding</Button>}
                          </>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>&quot;What tool do you wish you had?&quot; ({wishes.length})</CardTitle></CardHeader>
        <CardContent>
          {wishes.length === 0 ? <p className="text-sm text-muted-foreground">No answers yet.</p> :
            <ul className="text-sm space-y-2">{wishes.map((u) => <li key={u.id}><span className="text-muted-foreground">{u.email}:</span> {u.wish_tool}</li>)}</ul>}
        </CardContent>
      </Card>
    </div>
  )
}
