import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import { rateLimit } from '@/lib/server/rate-limit'
import { DEMO_TOKEN, isToken, vLabel } from '@/lib/approvals/core'
import { getPublicView, type PublicView } from '@/lib/approvals/public'
import { DEMO_OWNER, DEMO_PREVIEW, demoComments, demoItems, demoVersions } from '@/lib/approvals/demo'
import { ClientView } from '@/components/approvals/client-view'
import { MadeWith } from '@/components/made-with'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Ready for your approval', robots: { index: false, follow: false, nocache: true }, referrer: 'no-referrer' }

export default async function ClientApproval({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const demo = token === DEMO_TOKEN
  if (!demo && !isToken(token)) notFound()
  let v: PublicView | null
  if (demo) {
    const i = demoItems()[0], vs = demoVersions()
    v = { title: i.title, client_name: i.client_name, owner: DEMO_OWNER, latest: vs[0], previewUrl: DEMO_PREVIEW, versions: vs, comments: demoComments() }
  } else {
    const h = await headers()
    const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || 'anon'
    if (!rateLimit(`ap-view:${ip}`, 60, 60_000)) return <div className="grid min-h-screen place-items-center bg-[#050507] p-6 text-center text-zinc-300">Too many requests. Please wait a minute and refresh.</div>
    const sb = await createServerClient()
    const { data: { user } } = await sb.auth.getUser()
    v = await getPublicView(token, user?.id ?? null)
  }
  if (!v) notFound()
  const first = v.client_name.split(/\s+/)[0]
  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {demo && <div className="border-b border-emerald-400/30 bg-emerald-600/20 px-4 py-2 text-center text-xs text-emerald-100 sm:text-sm">Demo approval link: sample data. Comments and answers aren’t saved.</div>}
      <section className="cine-hero relative">
        <div className="cine-art" style={{ background: 'radial-gradient(70% 60% at 15% 0%, #34d39955, transparent 60%), radial-gradient(50% 50% at 100% 20%, #05966933, transparent 60%), #050507' }} />
        <div className="cine-grain" />
        <div className="mx-auto max-w-4xl px-4 pb-6 pt-10 sm:pt-16">
          <p className="cine-rise text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">{v.owner}</p>
          <h1 className="cine-rise cine-rise-1 mt-2 text-3xl font-black leading-tight sm:text-5xl">{v.title}</h1>
          <p className="cine-rise cine-rise-1 mt-3 text-zinc-300">{v.latest ? `Hi ${first}, ${vLabel(v.latest.number)} is ready. Have a look, leave comments, then approve it or ask for changes.` : `Hi ${first}, nothing is ready to review yet. Check back soon.`}</p>
        </div>
      </section>
      <main className="mx-auto max-w-4xl px-4 pb-16">
        {v.latest && <ClientView token={token} latest={v.latest} previewUrl={v.previewUrl} comments={v.comments} clientName={v.client_name} demo={demo} />}
        {v.versions.length > 1 && <p className="pt-6 text-center text-xs text-zinc-500">Earlier versions: {v.versions.slice(1).map((x) => `${vLabel(x.number)} (${x.status === 'approved' ? 'approved' : x.status === 'changes' ? 'changes requested' : 'replaced'})`).join(' · ')}</p>}
        <p className="pt-4 text-center text-xs text-zinc-600">This page is private to you. Please don’t share the link.</p>
      </main>
      <MadeWith tool="approvals" />
    </div>
  )
}
