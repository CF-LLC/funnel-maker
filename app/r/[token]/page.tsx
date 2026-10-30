import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import { rateLimit } from '@/lib/server/rate-limit'
import { DEMO_TOKEN, isToken, monthLabel } from '@/lib/reports/core'
import { clientPage } from '@/lib/reports/page-data'
import { ReportView } from '@/components/reports/report-view'
import { MadeWith } from '@/components/made-with'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Your monthly report', robots: { index: false, follow: false, nocache: true }, referrer: 'no-referrer' }

export default async function ClientReport({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ m?: string }> }) {
  const { token } = await params; const { m } = await searchParams
  const demo = token === DEMO_TOKEN
  if (!demo && !isToken(token)) notFound()
  let viewer: string | null = null
  if (!demo) {
    const h = await headers()
    const ip = (h.get('cf-connecting-ip') || h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || 'anon'
    if (!rateLimit(`rp-view:${ip}`, 60, 60_000)) return <div className="grid min-h-screen place-items-center bg-[#05070b] p-6 text-center text-zinc-300">Too many requests. Please wait a minute and refresh.</div>
    const sb = await createServerClient(); viewer = (await sb.auth.getUser()).data.user?.id ?? null
  }
  const v = await clientPage(token, m || null, viewer)
  if (!v) notFound()
  const pdf = `/r/${token}/pdf?m=${v.month}`
  return (
    <div className="min-h-screen bg-[#05070b] text-white">
      {v.demo && <div className="border-b border-sky-400/30 bg-sky-600/20 px-4 py-2 text-center text-xs text-sky-100 sm:text-sm">Demo report: sample numbers for a made-up bakery. Nothing here is real.</div>}
      <section className="cine-hero relative">
        <div className="cine-art" style={{ background: 'radial-gradient(70% 60% at 10% 0%, #0ea5e955, transparent 60%), radial-gradient(50% 50% at 100% 10%, #6366f144, transparent 60%), #05070b' }} />
        <div className="cine-grain" />
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 pb-4 pt-8 sm:pt-12">
          <p className="cine-rise text-sm text-zinc-300">From <span className="font-semibold text-white">{v.owner}</span> for {v.client}</p>
          <a href={pdf} className="cine-rise ml-auto inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200">Download PDF</a>
        </div>
      </section>
      <main className="mx-auto max-w-5xl px-4 pb-16">
        {v.months.length > 1 && (
          <nav aria-label="Other months" className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
            {v.months.map((x) => <Link key={x} href={`/r/${token}?m=${x}`} aria-current={x === v.month ? 'page' : undefined} className={`shrink-0 rounded-full border px-3 py-1 text-xs ${x === v.month ? 'border-sky-300 bg-sky-400/15 text-sky-100' : 'border-white/10 text-zinc-400 hover:bg-white/5'}`}>{monthLabel(x, 'short')}</Link>)}
          </nav>
        )}
        <ReportView sections={v.sections} logoUrl={v.logoUrl} owner={v.owner} />
        <p className="pt-8 text-center text-xs text-zinc-600">This report is private to you. Please don’t share the link.</p>
      </main>
      <MadeWith tool="reports" />
    </div>
  )
}
