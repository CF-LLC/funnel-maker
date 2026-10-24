'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Target, Download } from 'lucide-react'

type Lead = { id: string; created_at: string; name: string | null; email: string; phone: string | null; template: string | null }

export default function LeadsPage() {
  const params = useParams()
  const funnelId = String(params.funnelId)
  const [stats, setStats] = useState<any>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([fetch(`/api/analytics/${funnelId}`), fetch(`/api/funnels/${funnelId}/leads`)])
      .then(async ([a, l]) => {
        if (!a.ok || !l.ok) throw new Error('Could not load leads')
        setStats(await a.json())
        setLeads((await l.json()).leads)
      })
      .catch((e) => setError(e.message))
  }, [funnelId])

  if (error) return <div className="text-red-600">{error}</div>
  if (!stats) return <div>Loading leads...</div>

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground">Real submissions from your funnel. Visitor tracking is coming later.</p>
        </div>
        <Button asChild>
          <a href={`/api/funnels/${funnelId}/leads?format=csv`}><Download className="w-4 h-4 mr-2" />Export CSV</a>
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total leads</CardTitle>
            <Target className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.totalLeads}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Last 30 days</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.leadsLast30Days}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Leads per day</CardTitle><CardDescription>Last 30 days (UTC)</CardDescription></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.leads}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#82ca9d" name="Leads" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent leads</CardTitle></CardHeader>
        <CardContent>
          {leads.length === 0 ? <p className="text-muted-foreground">No leads yet.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b"><th className="py-2">Date</th><th>Name</th><th>Email</th><th>Phone</th></tr></thead>
              <tbody>
                {leads.slice(0, 100).map((l) => (
                  <tr key={l.id} className="border-b">
                    <td className="py-2">{new Date(l.created_at).toLocaleString()}</td>
                    <td>{l.name}</td><td>{l.email}</td><td>{l.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
