'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase'
import { PLANS, PLAN_FEATURES, checkoutUrl } from '@/lib/plans'

export function PricingPlans() {
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null)
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => data.user && setUser({ id: data.user.id, email: data.user.email }))
  }, [])

  return (
    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      {PLANS.map((plan) => {
        const href = checkoutUrl(plan, user || undefined)
        const featured = plan.id === 'founding'
        return (
          <Card key={plan.id} className={`flex flex-col ${featured ? 'border-primary shadow-lg' : ''}`}>
            <CardHeader>
              {featured && <div className="text-xs font-semibold text-primary mb-2">FOUNDING PRICE</div>}
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.note}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground"> {plan.period}</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ul className="space-y-3 mb-6 flex-1">
                {PLAN_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2"><Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" /><span className="text-sm">{f}</span></li>
                ))}
              </ul>
              {!user ? (
                <Link href="/auth/register" className="w-full"><Button className="w-full" variant={featured ? 'default' : 'outline'}>Create account first</Button></Link>
              ) : href ? (
                <a href={href} className="w-full"><Button className="w-full" variant={featured ? 'default' : 'outline'}>Pay with Stripe</Button></a>
              ) : (
                <Button className="w-full" variant="outline" disabled>Checkout opening soon</Button>
              )}
            </CardContent>
          </Card>
        )
      })}
      <p className="md:col-span-3 text-center text-xs text-muted-foreground">
        By paying you agree to our <Link href="/terms" className="underline">Terms</Link>, <Link href="/privacy" className="underline">Privacy Policy</Link> and <Link href="/refund" className="underline">Refund Policy</Link> (14-day money-back guarantee).
      </p>
    </div>
  )
}
