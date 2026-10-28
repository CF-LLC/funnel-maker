import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PricingPlans } from '@/components/pricing-plans'
import { PLANS } from '@/lib/plans'
import { getLaunchFlags } from '@/lib/flags'

export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await (supabase.from('users') as any)
    .select('approved, plan, paid_until')
    .eq('id', user.id)
    .maybeSingle()

  const plan = PLANS.find((p) => p.id === profile?.plan)
  const paidUntil = profile?.paid_until ? new Date(profile.paid_until) : null
  const active = !!plan && !!paidUntil && paidUntil.getTime() >= Date.now() - 86_400_000

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Your plan and payment status</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {plan ? `${plan.name} (${plan.price} ${plan.period})` : 'No plan yet'}
            <Badge variant={active ? 'default' : 'secondary'}>{active ? 'Paid' : 'Unpaid'}</Badge>
          </CardTitle>
          <CardDescription>
            {active && paidUntil ? `Paid through ${paidUntil.toLocaleDateString('en-US', { timeZone: 'UTC' })}.` : 'Pick a plan below. Payment is by Stripe; we mark your account paid once it is confirmed (usually same day).'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          To cancel or change plans, reply to your Stripe receipt or email support. Stripe receipts are your invoices.
        </CardContent>
      </Card>
      {!active && <PricingPlans flags={await getLaunchFlags()} />}
    </div>
  )
}
