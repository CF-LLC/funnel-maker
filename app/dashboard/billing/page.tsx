import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PricingPlans } from '@/components/pricing-plans'
import { PLANS } from '@/lib/plans'
import { getLaunchFlags } from '@/lib/flags'
import { SUPPORT_EMAIL } from '@/lib/site'
import { getTool } from '@/tools/registry'

export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await (supabase.from('users') as any)
    .select('approved, plan, paid_until')
    .eq('id', user.id)
    .maybeSingle()

  const { data: access } = await (supabase as any).from('app_access').select('tool, plan, source, active').eq('user_id', user.id).eq('active', true)
  const tools: { tool: string; plan: string | null; source: string }[] = access ?? []
  // A Stripe customer portal is not configured for this account, so self-serve management is shown disabled (no new Stripe calls).
  const portalUrl = process.env.STRIPE_CUSTOMER_PORTAL_URL
  const cancelHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Cancel my SaaS Nation plan')}&body=${encodeURIComponent(`Please cancel my plan for ${user.email}.`)}`
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
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div data-billing-tools>
            <div className="mb-1 font-semibold text-foreground">Your tools</div>
            {tools.length ? (
              <ul className="flex flex-wrap gap-2">{tools.map((t) => <li key={t.tool}><Badge variant="secondary">{t.tool === 'all' ? 'All Access' : getTool(t.tool)?.name ?? t.tool}{t.plan ? ` · ${t.plan}` : ''}{t.source === 'manual' || t.source === 'founding' ? ` · ${t.source}` : ''}</Badge></li>)}</ul>
            ) : <p>No tools active yet.</p>}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {portalUrl && /^https:\/\/billing\.stripe\.com\//.test(portalUrl)
              ? <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="press inline-flex min-h-[44px] items-center justify-center rounded-xl bg-brand px-5 font-semibold text-white" data-portal>Manage or cancel in Stripe</a>
              : <span aria-disabled="true" className="inline-flex min-h-[44px] cursor-not-allowed items-center justify-center rounded-xl bg-muted px-5 font-semibold opacity-60" data-portal-disabled title="Self-serve billing isn't set up yet">Manage in Stripe (coming soon)</span>}
            <a href={cancelHref} className="press inline-flex min-h-[44px] items-center justify-center rounded-xl px-5 font-semibold ring-1 ring-border hover:bg-muted" data-cancel>Cancel or change plan by email</a>
          </div>
          <p>We cancel within one business day and confirm by email. Stripe receipts are your invoices. See our <a href="/refund" className="underline">refund policy</a>.</p>
        </CardContent>
      </Card>
      {!active && <PricingPlans flags={await getLaunchFlags()} />}
    </div>
  )
}
