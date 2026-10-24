import { createServerClient } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { YourTools } from '@/components/tools/your-tools'

export const metadata = { title: 'Dashboard' }

/** SaaS Nation tools hub. Each tool has its own home (Funnel Maker: /funnels, Invoices: /invoices, Link-in-bio: /links). */
export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const checkoutSuccess = sp.checkout === 'success'
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await (supabase.from('users') as any).select('approved').eq('id', user!.id).maybeSingle()
  const approved = !!profile?.approved

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Welcome to SaaS Nation <span className="text-brand">✦</span></h1>
        <p className="text-muted-foreground">All your tools in one account.</p>
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

      <YourTools userId={user!.id} />
    </div>
  )
}
