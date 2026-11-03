import { createServerClient } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { publicTools, ALL_ACCESS, getTool } from '@/tools/registry'
import { getLaunchFlags } from '@/lib/flags'
import type { ToolDef } from '@/tools/types'
import { Hero } from '@/components/showcase/hero'
import { ToolRow } from '@/components/showcase/tool-row'
import { toolCard } from '@/components/showcase/cards'
import { recentWork, ago } from '@/components/showcase/dashboard-data'
import { OnboardingChecklist, type Step } from '@/components/dashboard/onboarding'
import { UpsellTiles } from '@/components/dashboard/upsell-tiles'
import { recordSignupOnce } from '@/lib/acquisition/server'
import { ResultsPanel } from '@/components/dashboard/results-panel'
import { loadResults } from '@/lib/me/results'
import { loadToday } from '@/lib/me/today'
import { buildToday, TODAY_TOOLS, type TodayItem } from '@/lib/me/today-core'
import { TodayPanel } from '@/components/dashboard/today-panel'
import { loadSetup } from '@/lib/me/setup'
import { buildSetup, SETUP_TOOLS, type SetupStep } from '@/lib/me/setup-core'
import { SetupChecklist } from '@/components/dashboard/setup-checklist'
import { isUserFlagEnabled } from '@/lib/flags'
import { isDemoUser } from '@/lib/demo'
import { attachReferralOnce, getOrCreateCode, referralStats } from '@/lib/referrals/server'
import { referralLink, referralRewardsEnabled } from '@/lib/referrals/core'
import { ReferCard } from '@/components/referrals/refer-card'
import { SITE_URL } from '@/lib/free-tools/site-url'

export const metadata = { title: 'Dashboard' }

/** SaaS Nation home screen: Continue hero, Your tools, Recent work, Try next. */
export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const checkoutSuccess = sp.checkout === 'success'
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [{ data: profile }, { data: access }, recent, { count: orgCount }, , results] = await Promise.all([
    (supabase.from('users') as any).select('approved').eq('id', user!.id).maybeSingle(),
    (supabase as any).from('app_access').select('tool, active').eq('user_id', user!.id),
    recentWork(supabase, user!.id),
    (supabase as any).from('organizations').select('id', { count: 'exact', head: true }).eq('owner_id', user!.id),
    recordSignupOnce(user!.id).then(() => attachReferralOnce(user!)),
    loadResults(supabase, user!.id, 30),
  ])
  const [refCode, refStats] = await Promise.all([getOrCreateCode(user!.id), referralStats(user!.id)])
  const approved = !!profile?.approved
  const active = new Set<string>((access || []).filter((r: any) => r.active).map((r: any) => r.tool))
  const all = active.has(ALL_ACCESS)
  const tools = [...publicTools(await getLaunchFlags())].sort((a, b) => a.showcase.order - b.showcase.order)
  const has = (t: ToolDef) => all || active.has(t.accessKey) || (!!t.includedWithAnyPlan && active.size > 0)
  const mine = tools.filter(has)
  // workspace_v2 (default off): Today panel, only for tools the user has. Off = dashboard unchanged.
  let today: TodayItem[] | null = null
  let setup: SetupStep[] | null = null
  if (!isDemoUser(user!.id) && (await isUserFlagEnabled('workspace_v2', user!.id))) {
    const avail = new Set<string>(mine.map((t) => t.id).filter((id) => (TODAY_TOOLS as readonly string[]).includes(id)))
    const setupAvail = new Set<string>(mine.map((t) => t.id).filter((id) => (SETUP_TOOLS as readonly string[]).includes(id)))
    const [counts, facts] = await Promise.all([loadToday(supabase, user!.id, avail), loadSetup(supabase, user!.id, setupAvail)])
    today = buildToday(counts, avail)
    setup = buildSetup(facts, setupAvail)
  }
  const locked = tools.filter((t) => !has(t))

  const last = recent[0]
  const heroTool = getTool(last?.tool ?? mine[0]?.id ?? 'funnels')!
  const steps: Step[] = [
    { id: 'approved', label: 'Account approved', hint: approved ? 'You can publish and share.' : 'Buying a plan gives you access right away. Otherwise we review new accounts by hand.', href: '/dashboard', done: approved },
    { id: 'plan', label: 'Pick your tools', hint: 'One tool or All Access.', href: '/pricing', done: active.size > 0 },
    { id: 'create', label: 'Make your first thing', hint: mine[0] ? `Start in ${mine[0].name}.` : 'A funnel, invoice or page.', href: mine[0]?.route ?? '/funnels/templates', done: recent.length > 0 },
    { id: 'org', label: 'Add your business', hint: 'Name and team, in Organizations.', href: '/dashboard/organizations', done: (orgCount ?? 0) > 0 },
  ]

  return (
    <div className="-mx-4 -mt-4 space-y-2 pb-10 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8">
      {(checkoutSuccess || !approved) && (
        <div className="space-y-3 px-4 pt-4 sm:px-8">
          {checkoutSuccess && (
            <Card className="border-green-500 bg-green-50" role="status">
              <CardContent className="py-4 text-sm text-green-900">
                <strong>Payment received, thank you!</strong> Buying a plan gives you access right away. Your Stripe
                receipt is on its way to your email.
              </CardContent>
            </Card>
          )}
          {!approved && (
            <Card className="border-amber-400 bg-amber-50">
              <CardContent className="py-4 text-sm text-amber-900">
                <strong>Your account is waiting for approval.</strong> Buying a plan gives you access right away; new accounts without a plan are reviewed and approved by hand. You can build and preview
                funnels now; publishing unlocks once you&apos;re approved.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {today && <TodayPanel items={today} />}
      {setup && <SetupChecklist steps={setup} />}

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
      </div>
      {/* workspace_v2 replaces the old checklist with "Get set up"; flag off = unchanged. */}
      {!setup && <OnboardingChecklist steps={steps} />}
      <ResultsPanel c={results} />
      {refCode && <ReferCard link={referralLink(refCode, SITE_URL)} stats={refStats} rewardsOn={referralRewardsEnabled()} />}
      <UpsellTiles tools={locked} />
      <div>
      </div>
    </div>
  )
}
