import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import { rateLimit } from '@/lib/server/rate-limit'
import { DEMO_TOKEN, fmtBytes, isToken, progress } from '@/lib/portal/core'
import { getPublicPortal, type PublicPortal } from '@/lib/portal/public'
import { DEMO_OWNER, demoFiles, demoItems, demoPortals, demoTasks } from '@/lib/portal/demo'
import { ClientChecklist } from '@/components/portal/client-checklist'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Your client portal', robots: { index: false, follow: false, nocache: true }, referrer: 'no-referrer' }
const KIND = { invoice: 'Invoice', proposal: 'Proposal', booking: 'Session' } as const
const ACT = { invoice: 'View & pay', proposal: 'View proposal', booking: '' } as const

export default async function ClientPortal({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ e?: string; demo?: string }> }) {
  const { token } = await params; const sp = await searchParams
  const demo = token === DEMO_TOKEN
  if (!demo && !isToken(token)) notFound()
  let v: PublicPortal | null
  if (demo) {
    const p = demoPortals()[0]
    v = { id: p.id, userId: '', client_name: p.client_name, welcome: p.welcome, owner: DEMO_OWNER, tasks: demoTasks(), files: demoFiles(), items: demoItems() }
  } else {
    const h = await headers()
    const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || 'anon'
    if (!rateLimit(`pt-view:${ip}`, 60, 60_000)) return <div className="grid min-h-screen place-items-center bg-[#050507] p-6 text-center text-zinc-300">Too many requests. Please wait a minute and refresh.</div>
    const sb = await createServerClient()
    const { data: { user } } = await sb.auth.getUser()
    v = await getPublicPortal(token, user?.id ?? null)
  }
  if (!v) notFound()
  const pr = progress(v.tasks)
  const first = v.client_name.split(/\s+/)[0]
  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {demo && <div className="border-b border-sky-400/30 bg-sky-600/20 px-4 py-2 text-center text-xs text-sky-100 sm:text-sm">Demo portal: sample data. Ticks and downloads aren’t saved.</div>}
      <section className="cine-hero relative">
        <div className="cine-art" style={{ background: 'radial-gradient(70% 60% at 15% 0%, #38bdf866, transparent 60%), radial-gradient(50% 50% at 100% 20%, #0ea5e933, transparent 60%), #050507' }} />
        <div className="cine-grain" />
        <div className="mx-auto max-w-3xl px-4 pb-8 pt-10 sm:pt-16">
          <p className="cine-rise text-xs font-bold uppercase tracking-[0.3em] text-sky-300">{v.owner}</p>
          <h1 className="cine-rise cine-rise-1 mt-2 text-3xl font-black leading-tight sm:text-5xl">Welcome, {first}.</h1>
          {v.welcome && <p className="cine-rise cine-rise-1 mt-3 whitespace-pre-line text-zinc-300">{v.welcome}</p>}
          {v.tasks.length > 0 && (
            <div className="cine-rise cine-rise-1 mt-6">
              <div className="mb-1 flex justify-between text-sm"><span className="text-zinc-300">Onboarding</span><span className="tabular-nums text-zinc-400">{pr.pct}% done</span></div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300" style={{ width: `${pr.pct}%` }} /></div>
            </div>
          )}
        </div>
      </section>
      <main className="mx-auto max-w-3xl space-y-8 px-4 pb-16">
        {sp.e && <p role="alert" className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">{sp.e === 'rate' ? 'Too many downloads. Wait a minute and try again.' : 'That download didn’t start. Please try again.'}</p>}
        {sp.demo && <p role="status" className="rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">Demo portal: downloads are turned off.</p>}
        {v.tasks.length > 0 && <section><h2 className="mb-3 text-lg font-bold">Your checklist</h2><ClientChecklist token={token} initial={v.tasks} /></section>}
        {v.items.length > 0 && (
          <section><h2 className="mb-3 text-lg font-bold">Your documents & sessions</h2>
            <ul className="space-y-2">{v.items.map((i) => (
              <li key={`${i.kind}${i.id}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="min-w-0 flex-1"><div className="text-[11px] font-bold uppercase tracking-wider text-sky-300">{KIND[i.kind]}</div><div className="truncate font-semibold">{i.title}</div><div className="text-xs text-zinc-400">{i.sub}</div></div>
                <div className="text-right">{i.amount && <div className="font-bold tabular-nums">{i.amount}</div>}<div className="text-xs capitalize text-zinc-400">{i.status}</div></div>
                {i.href && <a href={i.href} className="w-full rounded-full bg-white px-4 py-2 text-center text-sm font-bold text-black hover:bg-zinc-200 sm:w-auto">{ACT[i.kind]}</a>}
              </li>))}</ul>
          </section>
        )}
        {v.files.length > 0 && (
          <section><h2 className="mb-3 text-lg font-bold">Files</h2>
            <ul className="space-y-2">{v.files.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-sky-400/20 text-xs font-black uppercase text-sky-300">{(f.name.split('.').pop() || '').slice(0, 4)}</div>
                <div className="min-w-0 flex-1"><div className="truncate font-semibold">{f.name}</div><div className="text-xs text-zinc-500">{fmtBytes(f.size_bytes)}</div></div>
                <form method="post" action="/api/portal/public/file"><input type="hidden" name="token" value={token} /><input type="hidden" name="file_id" value={f.id} /><button className="rounded-full bg-sky-400 px-4 py-2 text-sm font-bold text-black hover:brightness-110">Download</button></form>
              </li>))}</ul>
          </section>
        )}
        {!v.tasks.length && !v.items.length && !v.files.length && <p className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-zinc-300">Nothing here yet. {v.owner} will add things soon.</p>}
        <p className="pt-4 text-center text-xs text-zinc-600">This page is private to you. Please don’t share the link.</p>
      </main>
    </div>
  )
}
