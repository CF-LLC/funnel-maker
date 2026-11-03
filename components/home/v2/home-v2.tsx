import Link from 'next/link'
import { FREE_TOOLS, FREE_TOOLS_PATH, freeToolPath } from '@/lib/free-tools/registry'
import { DEMOS, FINAL, FITS, HERO, faqs, jobsFor, pricingLine } from '@/lib/home/v2'
import { FaqItem, HomeView, TrackedLink } from './tracked'

const btn = 'inline-flex min-h-[48px] items-center justify-center rounded-xl px-5 text-base font-bold'
const primary = `${btn} bg-white text-black hover:bg-zinc-200`
const ghost = `${btn} bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20`

/** Job-based homepage body (between the existing Navbar and Footer). */
export function HomeV2({ flags, trial }: { flags: Record<string, boolean>; trial: boolean }) {
  const jobs = jobsFor(flags)
  const price = pricingLine(trial)
  const trialLabel = trial ? 'Start 7-day free trial' : 'Start building'
  return (
    <div data-home-v2 className="bg-zinc-950 text-white">
      <HomeView />
      <section className="mx-auto max-w-5xl px-4 pb-12 pt-16 sm:pt-24">
        <h1 className="text-4xl font-black tracking-tight sm:text-6xl">{HERO.title}</h1>
        <p className="mt-5 max-w-2xl text-lg text-zinc-300">{HERO.text}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <TrackedLink href="/auth/register" event="hero_trial_click" className={primary}>{trialLabel}</TrackedLink>
          <TrackedLink href={FREE_TOOLS_PATH} event="hero_free_tool_click" className={ghost}>Try a free tool, no signup</TrackedLink>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12" aria-labelledby="jobs-h">
        <h2 id="jobs-h" className="text-2xl font-bold sm:text-3xl">What do you need to do?</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {jobs.map((j) => (
            <article key={j.id} data-job={j.id} className="flex flex-col rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
              <h3 className="text-xl font-bold">{j.title}</h3>
              <p className="mt-2 text-zinc-300">{j.benefit}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {j.items.map((i) => (
                  <li key={i.name}>{i.href
                    ? <Link href={i.href} className="inline-flex min-h-[36px] items-center rounded-full bg-white/10 px-3 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/20">{i.name}</Link>
                    : <span className="inline-flex min-h-[36px] items-center rounded-full bg-white/5 px-3 text-sm text-zinc-200 ring-1 ring-white/10">{i.name}</span>}</li>
                ))}
              </ul>
              <div className="mt-auto pt-6"><TrackedLink href={j.href} event="job_card_click" tool={j.id} className={primary}>{j.cta}</TrackedLink></div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12" aria-labelledby="fits-h">
        <h2 id="fits-h" className="text-2xl font-bold sm:text-3xl">How it fits together</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {FITS.map((f) => <li key={f} className="rounded-xl bg-white/5 p-4 text-zinc-200 ring-1 ring-white/10">{f}</li>)}
        </ul>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12" data-price-line>
        <p className="text-xl font-bold">{price.head}</p>
        <p className="mt-2 text-zinc-300">{price.body}</p>
        <Link href="/pricing" className="mt-4 inline-block font-semibold text-emerald-300 hover:underline">See pricing →</Link>
      </section>

      <nav aria-label="Free tools" className="mx-auto max-w-5xl px-4 py-12" data-free-strip>
        <h2 className="text-2xl font-bold sm:text-3xl">Free, no signup, nothing stored</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {FREE_TOOLS.map((t) => <li key={t.slug}><Link href={freeToolPath(t.slug)} className="inline-flex min-h-[40px] items-center rounded-full bg-white/10 px-4 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/20">{t.name}</Link></li>)}
        </ul>
        <Link href={FREE_TOOLS_PATH} className="mt-4 inline-block font-semibold text-emerald-300 hover:underline">See all free tools →</Link>
      </nav>

      <section className="mx-auto max-w-3xl px-4 py-12" aria-labelledby="faq-h">
        <h2 id="faq-h" className="text-2xl font-bold sm:text-3xl">Questions</h2>
        <div className="mt-6 space-y-3">
          {faqs(trial).map(([q, a], n) => (
            <FaqItem key={q} n={n + 1} q={q}>
              <p>{a}</p>
              {n === 2 && <p className="mt-2 flex flex-wrap gap-3">{DEMOS.map(([k, label, href]) => <TrackedLink key={k} href={href} event="demo_view" tool={k} className="font-semibold text-emerald-300 hover:underline">{label}</TrackedLink>)}</p>}
            </FaqItem>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20 pt-12 text-center">
        <h2 className="text-3xl font-black sm:text-4xl">{FINAL.title}</h2>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/auth/register" className={primary}>{trialLabel}</Link>
          <Link href="/pricing" className={ghost}>See pricing</Link>
        </div>
      </section>
    </div>
  )
}
