import { Navbar } from '@/components/nav/navbar'
import { Footer } from '@/components/nav/footer'
import { getLaunchFlags } from '@/lib/flags'
import { HERO_TOOL_ID, getTool, toolsInRow } from '@/tools/registry'
import { Hero } from '@/components/showcase/hero'
import { toolCard } from '@/components/showcase/cards'
import { FreeToolsStrip } from '@/components/home/free-tools-strip'
import { ToolPicker } from '@/components/home/tool-picker'
import { Examples } from '@/components/home/examples'
import { WhyThis } from '@/components/home/why'
import { SocialProofSlot } from '@/components/home/social-proof'
import { UpdatesSignup } from '@/components/home/updates-signup'
import { HOME_PRICE_LINE } from '@/lib/home/pricing-line'

export const metadata = { alternates: { canonical: '/' } }

// Runtime launch flags (feature_flags) are re-read at most once a minute.
export const revalidate = 60

export default async function Home() {
  const flags = await getLaunchFlags()
  const hero = getTool(HERO_TOOL_ID)!
  const cards = (row: 'all' | 'coaches' | 'creators' | 'everyone') => toolsInRow(row, flags).map((t) => toolCard(t))
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <Hero
          art={hero.id}
          eyebrow="SaaS Nation"
          title="Simple tools for coaches and creators. One price, no bloat."
          text="Funnels, invoices, booking and more. Pick one tool or get them all."
          colors={hero.showcase.colors}
          shot={hero.showcase.shot}
          primary={{ href: '/pricing', label: 'See pricing' }}
          primaryIcon={false}
        >
          <FreeToolsStrip />
          <p className="mt-6 text-sm font-semibold text-zinc-200" data-price-line>{HOME_PRICE_LINE}</p>
        </Hero>
        <ToolPicker rows={{ all: cards('all'), coaches: cards('coaches'), creators: cards('creators'), everyone: cards('everyone') }} />
        <Examples />
        <WhyThis />
        <SocialProofSlot />
        <UpdatesSignup />
      </main>
      <Footer />
    </div>
  )
}
