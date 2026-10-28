import { notFound } from 'next/navigation'
import { findList } from '@/lib/emaillist/public'
import { SignupForm } from '@/components/emaillist/signup-form'

export const dynamic = 'force-dynamic'
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const l = await findList((await params).slug)
  return l ? { title: l.title, description: l.blurb || undefined } : { title: 'Not found' }
}
export default async function ListPage({ params }: { params: Promise<{ slug: string }> }) {
  const l = await findList((await params).slug)
  if (!l) notFound()
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07070a] px-4 py-12 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.25),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.3),transparent_55%)]" />
      <main className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">{l.fromName}</p>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">{l.title}</h1>
        {l.blurb && <p className="mt-3 whitespace-pre-line text-zinc-300">{l.blurb}</p>}
        <div className="mt-6"><SignupForm slug={l.slug} fromName={l.fromName} doubleOptIn={l.doubleOptIn} demo={l.demo} /></div>
      </main>
    </div>
  )
}
