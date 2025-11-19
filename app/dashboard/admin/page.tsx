'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Users, Zap, Shield, DollarSign, TrendingUp, Search, ExternalLink, Copy, Check } from 'lucide-react'

type User = {
  id: string
  email: string
  funnels: { count: number }[]
  subscription: {
    plan_type: string
    status: string
    current_period_end: string | null
  } | null
}

type Funnel = {
  id: string
  name: string
  slug: string | null
  is_public: boolean
  created_at: string
  steps: any
  user: { email: string } | null
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAndLoadData()
  }, [])

  async function checkAdminAndLoadData() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/auth/login')
      return
    }

    // Check if user is admin
    const { data: adminData } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!adminData) {
      router.push('/dashboard')
      return
    }

    // Load users
    const { data: usersData } = await supabase
      .from('users')
      .select(`
        *,
        funnels:funnels(count),
        subscription:subscriptions(*)
      `)
      .order('email', { ascending: true })

    // Load funnels
    const { data: funnelsData } = await supabase
      .from('funnels')
      .select(`
        *,
        user:users(email)
      `)
      .order('created_at', { ascending: false })

    setUsers(usersData || [])
    setFunnels(funnelsData || [])
    setLoading(false)
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredFunnels = funnels.filter(funnel =>
    funnel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    funnel.user?.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    totalUsers: users.length,
    totalFunnels: funnels.length,
    publicFunnels: funnels.filter(f => f.is_public).length,
    paidUsers: users.filter(u => u.subscription?.plan_type !== 'free' && u.subscription?.plan_type).length,
    activeSubs: users.filter(u => u.subscription?.status === 'active').length,
    avgFunnelsPerUser: users.length > 0 ? (funnels.length / users.length).toFixed(1) : 0,
    planBreakdown: {
      free: users.filter(u => !u.subscription || u.subscription.plan_type === 'free').length,
      starter: users.filter(u => u.subscription?.plan_type === 'starter').length,
      pro: users.filter(u => u.subscription?.plan_type === 'pro').length,
      enterprise: users.filter(u => u.subscription?.plan_type === 'enterprise').length,
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-amber-500" />
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">System overview and management</p>
          </div>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users or funnels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.paidUsers} paid subscribers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Funnels</CardTitle>
            <Zap className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFunnels}</div>
            <p className="text-xs text-muted-foreground">
              {stats.publicFunnels} public • Avg {stats.avgFunnelsPerUser} per user
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubs}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.activeSubs / stats.totalUsers) * 100).toFixed(1)}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plan Distribution</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Free: {stats.planBreakdown.free}</span>
                <span className="text-muted-foreground">Starter: {stats.planBreakdown.starter}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Pro: {stats.planBreakdown.pro}</span>
                <span className="text-muted-foreground">Enterprise: {stats.planBreakdown.enterprise}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({filteredUsers.length})</CardTitle>
          <CardDescription>Registered accounts and their subscription status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between border rounded-lg p-4 hover:bg-muted/50">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-medium">{user.email}</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(user.id, `user-${user.id}`)}
                    >
                      {copiedId === `user-${user.id}` ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{user.funnels?.[0]?.count || 0} funnels</span>
                    {user.subscription?.status && (
                      <span>Status: {user.subscription.status}</span>
                    )}
                    {user.subscription?.current_period_end && (
                      <span>
                        Renews: {new Date(user.subscription.current_period_end).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={user.subscription?.plan_type === 'free' || !user.subscription ? 'secondary' : 'default'}>
                    {user.subscription?.plan_type || 'free'}
                  </Badge>
                  {user.subscription?.status === 'active' && user.subscription.plan_type !== 'free' && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                      Active
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Funnels Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Funnels ({filteredFunnels.length})</CardTitle>
          <CardDescription>All created funnels across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredFunnels.map((funnel) => (
              <div key={funnel.id} className="border rounded-lg p-4 hover:bg-muted/50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium">{funnel.name}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(funnel.id, `funnel-${funnel.id}`)}
                      >
                        {copiedId === `funnel-${funnel.id}` ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{funnel.user?.email || 'Unknown user'}</span>
                      <span>•</span>
                      <span>{Array.isArray(funnel.steps) ? funnel.steps.length : 0} steps</span>
                      <span>•</span>
                      <span>{new Date(funnel.created_at).toLocaleDateString()}</span>
                    </div>
                    {funnel.slug && (
                      <div className="text-xs text-muted-foreground mt-1">
                        URL: /f/{funnel.slug}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {funnel.is_public && (
                      <>
                        <Badge variant="outline" className="text-xs">Public</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(funnel.slug ? `/f/${funnel.slug}` : `/public/${funnel.id}`, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
