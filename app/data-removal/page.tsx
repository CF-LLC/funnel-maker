import Link from 'next/link'
import { ExternalLink, ListChecks, BellRing, ShieldCheck } from 'lucide-react'
import { Navbar } from '@/components/nav/navbar'
import { Footer } from '@/components/nav/footer'
import { Backdrop } from '@/components/booking/backdrop'
import { VISIBLE_BROKERS } from '@/lib/dataremoval/brokers'
import { Disclaimer } from '@/components/dataremoval/disclaimer'

export const metadata = { title: 'Data Removal | SaaS Nation', description: 'A guided checklist for opting out of people-search and data-broker sites. $12/mo or included in All Access.', alternates: { canonical: '/data-removal' } }

const FEATURES = [
  { icon: ExternalLink, title: 'Direct opt-out links', body: 'Every site links straight to its opt-out page, with a last-checked date.' },
  { icon: ListChecks, title: 'One checklist', body: 'Mark each site Not listed, Requested, Removed or Reappeared and see your progress.' },
  { icon: BellRing, title: 'Re-check every 60 days', body: 'Listings often come back. Add a calendar reminder or email yourself one.' },
]

export default function DataRemovalLanding() {
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white" style={{ ['--cine-fade' as string]: '#0a0a0c' }}>
      <Navbar />
      <header className="cine-hero relative overflow-hidden px-5 pb-16 pt-16 sm:pb-24 sm:pt-24">
        <Backdrop hue="mono" />
        <div className="relative mx-auto max-w-4xl">
          <p className="cine-rise text-xs font-bold uppercase tracking-[.25em] text-indigo-300">SaaS Nation · Data Removal</p>
          <h1 className="cine-rise cine-rise-1 cine-title mt-3">Take your name off people-search sites.</h1>
          <p className="cine-rise cine-rise-2 mt-4 max-w-2xl text-lg text-zinc-300">A guided checklist for {VISIBLE_BROKERS.length} major US people-search and data-broker sites. You do each opt-out yourself; we keep the links, steps and reminders in one place.</p>
          <div className="cine-rise cine-rise-3 mt-8 flex flex-wrap gap-3">
            <Link href="/data-removal/tracker" className="rounded-full bg-white px-6 py-3 font-semibold text-black hover:bg-zinc-200">Open the tracker</Link>
            <Link href="/pricing" className="rounded-full border border-white/25 px-6 py-3 font-semibold hover:border-white/60">$12/mo or in All Access</Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-10 px-5 pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="cine-glass rounded-2xl p-5">
              <f.icon className="h-6 w-6 text-indigo-300" />
              <h2 className="mt-3 font-bold">{f.title}</h2>
              <p className="mt-1 text-sm text-zinc-400">{f.body}</p>
            </div>
          ))}
        </div>
        <section className="cine-glass rounded-2xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-indigo-300" />Sites on the checklist</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {VISIBLE_BROKERS.map((b) => <li key={b.id} className="cine-chip">{b.name}</li>)}
          </ul>
          <p className="mt-4 text-xs text-zinc-500">Each opt-out link was checked recently. We add sites only after checking their opt-out page.</p>
        </section>
        <Disclaimer />
      </main>
      <Footer />
    </div>
  )
}
