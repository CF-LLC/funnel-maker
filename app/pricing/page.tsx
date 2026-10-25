import Link from 'next/link'
import { Navbar } from '@/components/nav/navbar'
import { Footer } from '@/components/nav/footer'
import { PricingPlans } from '@/components/pricing-plans'
import { ToolsList } from '@/components/tools/tools-list'
import { starterSitesUrl } from '@/lib/url-safety'

export const metadata = { title: 'Pricing | SaaS Nation', description: 'Each tool $12/mo or $99/yr. All Access $29/mo or $249/yr.' }

const FAQ = [
  ['Can I cancel anytime?', "Yes. Cancel from your account whenever you like and your plan stays active until the end of the period you've paid for."],
  ['Can I switch plans?', 'Yes. Move from a single tool to All Access, or between monthly and yearly, from your account at any time.'],
  ['Is Link-in-bio really included?', 'Yes, with any paid plan. Single-tool plans show a small "Made with SaaS Nation" badge; All Access removes it.'],
  ["Do you handle my customers' payments?", "Never. Your customers pay you directly through your own Stripe Payment Link. We never touch your customers' money and take no cut of your sales."],
  ['How fast can I start?', "Every account is approved by hand within 24 hours of signup. You'll get access as soon as it's approved."],
]

export default function PricingPage() {
  const starter = starterSitesUrl()
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="container mx-auto flex-1 px-4 py-16 sm:py-20">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h1 className="mb-4 text-4xl font-bold md:text-5xl">Simple tools for coaches and creators. One price, no bloat.</h1>
          <p className="text-lg text-muted-foreground">Get the one tool you need, or all eight SaaS Nation tools for less than most single apps cost. Built for US online coaches, course creators and creators.</p>
        </div>
        <PricingPlans />
        <h2 className="mt-16 mb-6 text-center text-2xl font-bold">The tools</h2>
        <ToolsList />
        <p className="text-center text-sm text-muted-foreground">More tools are on the way. All Access members get each one the day it launches.</p>
        <section className="mx-auto mt-16 max-w-3xl">
          <h2 className="mb-4 text-2xl font-bold">FAQ</h2>
          <div className="divide-y divide-white/10 rounded-2xl border border-white/10">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group p-4"><summary className="cursor-pointer font-semibold">{q}</summary><p className="mt-2 text-sm text-muted-foreground">{a}</p></details>
            ))}
          </div>
        </section>
        {starter && <p className="mt-12 text-center text-sm"><Link href={starter} className="underline">Want us to build it? See CF LLC Starter Sites →</Link></p>}
      </main>
      <Footer />
    </div>
  )
}
