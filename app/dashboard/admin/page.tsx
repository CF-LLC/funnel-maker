import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import { isAdmin, getAllUsers, getAllFunnels } from '@/lib/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Zap, Shield } from 'lucide-react'

export default async function AdminPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const adminAccess = await isAdmin(user.id)
  if (!adminAccess) {
    redirect('/dashboard')
  }

  const users = await getAllUsers()
  const funnels = await getAllFunnels()

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-amber-500" />
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">System overview and management</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              Registered accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Funnels</CardTitle>
            <Zap className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{funnels.length}</div>
            <p className="text-xs text-muted-foreground">
              Across all users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Public Funnels</CardTitle>
            <Zap className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {funnels.filter((f: any) => f.is_public).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Publicly accessible
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>Latest registered accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.slice(0, 10).map((user: any) => (
                <div key={user.id} className="flex items-center justify-between border-b pb-3">
                  <div>
                    <div className="font-medium">{user.email}</div>
                    <div className="text-sm text-muted-foreground">
                      {user.funnels?.[0]?.count || 0} funnels
                    </div>
                  </div>
                  <Badge variant={user.subscription ? 'default' : 'secondary'}>
                    {user.subscription?.plan_type || 'free'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Funnels</CardTitle>
            <CardDescription>Latest created funnels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {funnels.slice(0, 10).map((funnel: any) => (
                <div key={funnel.id} className="border-b pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium">{funnel.name}</div>
                    {funnel.is_public && (
                      <Badge variant="outline" className="text-xs">Public</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {funnel.user?.email || 'Unknown'} • {Array.isArray(funnel.steps) ? funnel.steps.length : 0} steps
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(funnel.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
