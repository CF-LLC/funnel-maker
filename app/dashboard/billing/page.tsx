import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatPrice, getPlanDetails, PlanType } from '@/lib/stripe'
import { getUserSubscription } from '@/lib/subscription'
import { CreditCard, Calendar, TrendingUp } from 'lucide-react'

async function handleManageSubscription() {
  'use server'
  
  const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/billing/portal`, {
    method: 'POST',
  })
  
  const data = await response.json()
  
  if (data.url) {
    redirect(data.url)
  }
}

export default async function BillingPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const subscription = await getUserSubscription(user.id)
  const planDetails = getPlanDetails((subscription?.plan_type || 'free') as PlanType)

  const statusColors = {
    active: 'bg-green-500',
    past_due: 'bg-yellow-500',
    canceled: 'bg-red-500',
    incomplete: 'bg-orange-500',
  } as const

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and billing details</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{planDetails.name}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {subscription?.plan_type === 'free' ? 'Free forever' : `${formatPrice(planDetails.price)}/month`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <CreditCard className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={statusColors[subscription?.status as keyof typeof statusColors] || 'bg-gray-500'}
              >
                {subscription?.status || 'active'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {subscription?.status === 'active' ? 'All systems go!' : 'Action may be required'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Billing Date</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscription?.current_period_end
                ? new Date(subscription.current_period_end).toLocaleDateString()
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {subscription?.plan_type === 'free' ? 'No billing' : 'Auto-renews'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan Features</CardTitle>
          <CardDescription>What's included in your {planDetails.name} plan</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {planDetails.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Subscription</CardTitle>
          <CardDescription>
            Update your payment method, view invoices, or cancel your subscription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription?.plan_type !== 'free' && subscription?.stripe_customer_id ? (
            <form action={handleManageSubscription}>
              <Button type="submit">
                Manage Subscription
              </Button>
            </form>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                You're currently on the free plan. Upgrade to unlock more features!
              </p>
              <Button asChild>
                <a href="/pricing">View Plans</a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
