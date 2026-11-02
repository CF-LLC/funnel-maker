import { pageMeta, PRICING_DESCRIPTION } from '@/lib/og/pages'
import Link from 'next/link'
import { Navbar } from '@/components/nav/navbar'
import { Footer } from '@/components/nav/footer'
import { PricingPlans } from '@/components/pricing-plans'
import { TrustLine } from '@/components/trust-line'
import { ToolsList } from '@/components/tools/tools-list'
import { getLaunchFlags, isFeatureEnabled } from '@/lib/flags'
import { TRIAL_FAQ, TRIAL_FLAG } from '@/lib/trial/copy'
import { publicTools } from '@/tools/registry'

const countWord = (n: number) => ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'][n] ?? String(n)
import { starterSitesUrl } from '@/lib/url-safety'
import { ldHtml, pricingLd } from '@/lib/seo/schema'

export const metadata = pageMeta({ title: 'Pricing | SaaS Nation', description: PRICING_DESCRIPTION, path: '/pricing', absoluteTitle: true })

const FAQ = [
  ['What is SaaS Nation?', 'A set of small tools for US online coaches and creators, including Funnels, Invoices, Forms, Proposals, Testimonials, Booking, Client list, Email list, Digital downloads and Link-in-bio.'],
  ['How much is it?', '$12/mo ($99/yr) for one tool, or $29/mo ($249/yr) for All Access, including every future tool.'],
  ['Does SaaS Nation take a cut?', 'No. Customers pay you through your own Stripe Payment Link.'],
  ['Is there a free plan?', 'No paid-tool free plan, but the free tools at /free-tools need no signup.'],
  ['What is the client portal?', 'One private link per client showing invoices, proposals, bookings and files, with an onboarding checklist. $12/mo or $99/yr, in All Access.'],
  ['Can I cancel anytime?', "Yes. Cancel from your account whenever you like and your plan stays active until the end of the period you've paid for."],
  ['Can I switch plans?', 'Yes. Move from a single tool to All Access, or between monthly and yearly, from your account at any time.'],
  ['Is Link-in-bio really included?', 'Yes, with any paid plan. Single-tool plans show a small "Made with SaaS Nation" badge; All Access removes it.'],
  ["Do you handle my customers' payments?", "Never. Your customers pay you directly through your own Stripe Payment Link. We never touch your customers' money and take no cut of your sales."],
  ['How fast can I start?', 'Buying a plan gives you access to that tool right away. New accounts without a plan are reviewed and approved by hand.'],
]

const faqFor = (trial: boolean) => (trial ? [FAQ[0], FAQ[1], TRIAL_FAQ, ...FAQ.slice(2)] : FAQ)
const faqLdFor = (faq: string[][]) => JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }).replace(/</g, '\\u003c')

export const revalidate = 60

export default async function PricingPage() {
  const [flags, trial] = await Promise.all([getLaunchFlags(), isFeatureEnabled(TRIAL_FLAG)])
  const faq = faqFor(trial)
  const starter = starterSitesUrl()
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqLdFor(faq) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldHtml(pricingLd(PRICING_DESCRIPTION)) }} />
      <main className="container mx-auto flex-1 px-4 py-16 sm:py-20">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h1 className="mb-4 text-4xl font-bold md:text-5xl">Simple tools for coaches and creators. One price, no bloat.</h1>
          <p className="text-lg text-muted-foreground">Get the one tool you need, or all {countWord(publicTools(flags).length)} SaaS Nation tools for less than most single apps cost. Built for US online coaches, course creators and creators.</p>
        </div>
        <PricingPlans flags={flags} trial={trial} />
        <TrustLine className="mt-6" />
        <h2 className="mt-16 mb-6 text-center text-2xl font-bold">The tools</h2>
        <ToolsList flags={flags} />
        <p className="text-center text-sm text-muted-foreground">More tools are on the way. All Access members get each one the day it launches.</p>
        <section className="mx-auto mt-16 max-w-3xl">
          <h2 className="mb-4 text-2xl font-bold">FAQ</h2>
          <div className="divide-y divide-white/10 rounded-2xl border border-white/10">
            {faq.map(([q, a]) => (
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
