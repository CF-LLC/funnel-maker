import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap, BarChart3, TrendingUp, Plus, ArrowRight } from 'lucide-react'
import { templates } from '@/data/templates'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const checkoutSuccess = sp.checkout === 'success'
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: funnels } = await supabase
    .from('funnels')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const funnelCount = funnels?.length || 0
  const liveCount = (funnels || []).filter((f: any) => f.is_public).length
  const { data: profile } = await (supabase.from('users') as any)
    .select('approved, signup_template')
    .eq('id', user!.id)
    .maybeSingle()
  const approved = !!profile?.approved
  const signupTemplate: string | null = profile?.signup_template || null
  const TEMPLATE_NAMES: Record<string, string> = Object.fromEntries(templates.map((t) => [t.id, t.name]))
  const swatch = (id?: string | null) => templates.find((t) => t.id === id)?.swatch || 'var(--brand-gradient)'

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Welcome back <span className="text-brand">✦</span></h1>
          <p className="text-muted-foreground">Build, preview and publish in three steps.</p>
        </div>
        <Link href="/dashboard/templates" className="w-full sm:w-auto">
          <Button size="lg" className="w-full gap-2 sm:w-auto">
            <Plus className="w-4 h-4" />
            New Funnel
          </Button>
        </Link>
      </div>

      {checkoutSuccess && (
        <Card className="border-green-500 bg-green-50" role="status">
          <CardContent className="py-4 text-sm text-green-900">
            <strong>Payment received, thank you!</strong> Your account will be activated within 24 hours. Your Stripe
            receipt is on its way to your email.
          </CardContent>
        </Card>
      )}

      {!approved && (
        <Card className="border-amber-400 bg-amber-50">
          <CardContent className="py-4 text-sm text-amber-900">
            <strong>Your account is waiting for approval</strong> (usually within 24 hours). You can build and preview
            funnels now; publishing unlocks once you&apos;re approved.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
        <Card className="lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Funnels</CardTitle>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><Zap className="w-4 h-4" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{funnelCount}</div>
            <p className="text-xs text-muted-foreground">
              Active funnels in your account
            </p>
          </CardContent>
        </Card>

        <Card className="lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live funnels</CardTitle>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-100 text-fuchsia-700"><BarChart3 className="w-4 h-4" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{liveCount} / 3</div>
            <p className="text-xs text-muted-foreground">Your plan includes up to 3 live funnels</p>
          </CardContent>
        </Card>

        <Card className="lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account</CardTitle>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><TrendingUp className="w-4 h-4" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approved ? 'Approved' : 'Pending'}</div>
            <p className="text-xs text-muted-foreground">{approved ? 'You can publish funnels' : 'Publishing unlocks after approval'}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Recent Funnels</h2>
        {funnelCount === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-lg"><Zap className="w-7 h-7" /></span>
              <h3 className="text-lg font-semibold mb-2">No funnels yet</h3>
              <p className="text-muted-foreground mb-4">
                {signupTemplate ? `Start with the ${TEMPLATE_NAMES[signupTemplate] || 'template'} you picked at signup` : 'Get started by creating your first funnel'}
              </p>
              <Link href={signupTemplate ? `/dashboard/templates?start=${signupTemplate}` : '/dashboard/templates'}>
                <Button size="lg">{signupTemplate ? `Create my ${TEMPLATE_NAMES[signupTemplate] || ''} funnel` : 'Browse Templates'}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {funnels?.slice(0, 4).map((funnel: any) => (
              <Link key={funnel.id} href={`/dashboard/funnels/${funnel.id}`} className="group rounded-xl">
                <Card className="lift overflow-hidden cursor-pointer">
                  <div className="h-2" style={{ background: swatch(funnel.template) }} />
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2"><span className="truncate">{funnel.name}</span><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" /></CardTitle>
                    <CardDescription>
                      {Array.isArray(funnel.steps) ? funnel.steps.length : 0} pages · {funnel.is_public ? <span className="font-semibold text-emerald-700">Live</span> : 'Draft'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(funnel.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
