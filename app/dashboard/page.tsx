import { createServerClient } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { TOOL_REGISTRY, ALL_ACCESS, getTool } from '@/tools/registry'
import type { ToolDef } from '@/tools/types'
import { Hero } from '@/components/showcase/hero'
import { ToolRow } from '@/components/showcase/tool-row'
import { toolCard } from '@/components/showcase/cards'
import { recentWork, ago } from '@/components/showcase/dashboard-data'

export const metadata = { title: 'Dashboard' }

/** SaaS Nation home screen: Continue hero, Your tools, Recent work, Try next. */
export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const checkoutSuccess = sp.checkout === 'success'
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [{ data: profile }, { data: access }, recent] = await Promise.all([
    (supabase.from('users') as any).select('approved').eq('id', user!.id).maybeSingle(),
    (supabase as any).from('app_access').select('tool, active').eq('user_id', user!.id),
    recentWork(supabase, user!.id),
  ])
  const approved = !!profile?.approved
  const active = new Set<string>((access || []).filter((r: any) => r.active).map((r: any) => r.tool))
  const all = active.has(ALL_ACCESS)
  const tools = [...(TOOL_REGISTRY as readonly ToolDef[])].sort((a, b) => a.showcase.order - b.showcase.order)
  const has = (t: ToolDef) => all || active.has(t.accessKey) || (!!t.includedWithAnyPlan && active.size > 0)
  const mine = tools.filter(has)
  const locked = tools.filter((t) => !has(t))

  const last = recent[0]
  const heroTool = getTool(last?.tool ?? mine[0]?.id ?? 'funnels')!

  return (
    <div className="-mx-4 -mt-4 space-y-2 pb-10 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8">
      {(checkoutSuccess || !approved) && (
        <div className="space-y-3 px-4 pt-4 sm:px-8">
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
        </div>
      )}

      <Hero
        art={heroTool.id}
        eyebrow={last ? `Continue · ${heroTool.name}` : heroTool.name}
        title={last ? last.title : 'Welcome to SaaS Nation'}
        text={last ? `Last edited ${ago(last.at)}. ${heroTool.showcase.cardTagline}` : heroTool.showcase.cardTagline}
        colors={heroTool.showcase.colors}
        shot={heroTool.showcase.shot}
        primary={{ href: last ? last.href : has(heroTool) ? heroTool.route : '/pricing', label: last ? 'Continue' : has(heroTool) ? 'Start' : 'Unlock' }}
        secondary={{ href: heroTool.route, label: `All ${heroTool.name}` }}
      />

      <div className="relative z-10 -mt-10 space-y-2 sm:-mt-16">
        <ToolRow id="your-tools" title="Your tools" cards={mine.map((t) => toolCard(t, { href: t.route, cta: 'Open' }))} />
        <ToolRow id="recent" title="Recent work" cards={recent.slice(0, 12).map((i) => {
          const t = getTool(i.tool)!
          return { id: `${i.tool}-${i.id}`, art: t.id, name: i.title, tagline: `${t.name} · ${ago(i.at)}`, colors: t.showcase.colors, shot: t.showcase.shot, href: i.href, cta: 'Continue', badge: t.name }
        })} />
        <ToolRow id="try-next" title="Try next" cards={locked.map((t) => toolCard(t, { href: '/pricing', cta: 'Unlock', badge: 'Locked' }))} />
      </div>
    </div>
  )
}
