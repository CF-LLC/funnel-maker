import { Navbar } from '@/components/nav/navbar'
import { Footer } from '@/components/nav/footer'
import { HOME_ROWS, HERO_TOOL_ID, getTool, toolsInRow } from '@/tools/registry'
import { Hero } from '@/components/showcase/hero'
import { ToolRow } from '@/components/showcase/tool-row'
import { toolCard } from '@/components/showcase/cards'

export default function Home() {
  const hero = getTool(HERO_TOOL_ID)!
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <Hero
          art={hero.id}
          eyebrow={hero.name}
          title="Simple tools for coaches and creators. One price, no bloat."
          text={hero.showcase.cardTagline}
          colors={hero.showcase.colors}
          shot={hero.showcase.shot}
          primary={{ href: '/auth/register', label: 'Start building' }}
          secondary={{ href: '/templates', label: 'See it' }}
        />
        <div id="tools" className="relative z-10 -mt-10 space-y-2 pb-16 sm:-mt-16">
          {HOME_ROWS.map((r) => (
            <ToolRow key={r.id} id={r.id} title={r.title} cards={toolsInRow(r.id).map((t) => toolCard(t))} />
          ))}
        </div>
      </main>
      <Footer />
    </div>
  )
}
