import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import { rateLimit } from '@/lib/server/rate-limit'
import { DEMO_TOKEN, isToken, money, requestCents, type Req } from '@/lib/changelog/core'
import { getPublicLog, type PublicLog } from '@/lib/changelog/public'
import { DEMO_OWNER, demoProjects, demoRequests } from '@/lib/changelog/demo'
import { ClientRequests } from '@/components/changelog/client-requests'
import { MadeWith } from '@/components/made-with'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Extra requests', robots: { index: false, follow: false, nocache: true }, referrer: 'no-referrer' }

export default async function ClientChangeLog({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const demo = token === DEMO_TOKEN
  if (!demo && !isToken(token)) notFound()
  let v: PublicLog | null
  if (demo) {
    const p = demoProjects()[0]
    v = { title: p.title, client_name: p.client_name, currency: p.currency, hourly_rate_cents: p.hourly_rate_cents, owner: DEMO_OWNER, requests: demoRequests().map(({ invoice_id, invoiced_at: _i, project_id: _p, ...r }) => ({ ...r, invoiced: !!invoice_id })) }
  } else {
    const h = await headers()
    const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || 'anon'
    if (!rateLimit(`cl-view:${ip}`, 60, 60_000)) return <div className="grid min-h-screen place-items-center bg-[#050507] p-6 text-center text-zinc-300">Too many requests. Please wait a minute and refresh.</div>
    const sb = await createServerClient()
    const { data: { user } } = await sb.auth.getUser()
    v = await getPublicLog(token, user?.id ?? null)
  }
  if (!v) notFound()
  const sum = (s: Req['status']) => v!.requests.filter((r) => r.status === s).reduce((a, r) => a + requestCents(r, v!.hourly_rate_cents), 0)
  const first = v.client_name.split(/\s+/)[0]
  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {demo && <div className="border-b border-purple-400/30 bg-purple-600/20 px-4 py-2 text-center text-xs text-purple-100 sm:text-sm">Demo change log: sample data. Answers aren’t saved.</div>}
      <section className="cine-hero relative">
        <div className="cine-art" style={{ background: 'radial-gradient(70% 60% at 15% 0%, #c084fc55, transparent 60%), radial-gradient(50% 50% at 100% 20%, #7c3aed33, transparent 60%), #050507' }} />
        <div className="cine-grain" />
        <div className="mx-auto max-w-3xl px-4 pb-8 pt-10 sm:pt-16">
          <p className="cine-rise text-xs font-bold uppercase tracking-[0.3em] text-purple-300">{v.owner}</p>
          <h1 className="cine-rise cine-rise-1 mt-2 text-3xl font-black leading-tight sm:text-5xl">{v.title}</h1>
          <p className="cine-rise cine-rise-1 mt-3 text-zinc-300">Hi {first}, here are the extras you’ve asked for. OK the ones you want added.</p>
          <div className="cine-rise cine-rise-1 mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4"><div className="text-xs uppercase tracking-wider text-emerald-300">Approved extras</div><div className="mt-1 text-2xl font-black tabular-nums">{money(sum('approved'), v.currency)}</div></div>
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4"><div className="text-xs uppercase tracking-wider text-amber-300">Waiting for you</div><div className="mt-1 text-2xl font-black tabular-nums">{money(sum('pending'), v.currency)}</div></div>
          </div>
        </div>
      </section>
      <main className="mx-auto max-w-3xl px-4 pb-16">
        <ClientRequests token={token} initial={v.requests} currency={v.currency} rate={v.hourly_rate_cents} demo={demo} />
        <p className="pt-8 text-center text-xs text-zinc-600">This page is private to you. Please don’t share the link.</p>
      </main>
      <MadeWith tool="changelog" />
    </div>
  )
}
