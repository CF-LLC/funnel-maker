import { notFound } from 'next/navigation'
import { findList } from '@/lib/emaillist/public'
import { SignupForm } from '@/components/emaillist/signup-form'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false } }
export default async function Embed({ params }: { params: Promise<{ slug: string }> }) {
  const l = await findList((await params).slug)
  if (!l) notFound()
  return (
    <div className="min-h-screen bg-[#0b0b10] p-4 text-white">
      <h1 className="text-xl font-extrabold">{l.title}</h1>
      {l.blurb && <p className="mt-1 text-sm text-zinc-300">{l.blurb}</p>}
      <div className="mt-4"><SignupForm slug={l.slug} fromName={l.fromName} doubleOptIn={l.doubleOptIn} demo={l.demo} embed /></div>
    </div>
  )
}
