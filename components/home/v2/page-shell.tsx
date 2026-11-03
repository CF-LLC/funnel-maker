import { Navbar } from '@/components/nav/navbar'
import { Footer } from '@/components/nav/footer'
import { ldHtml, organizationLd, websiteLd } from '@/lib/seo/schema'
import { HomeV2 } from './home-v2'

/** Same shell as the current homepage (schema, existing Navbar and Footer) around the v2 body. */
export function HomeV2Page({ flags, trial }: { flags: Record<string, boolean>; trial: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldHtml([organizationLd(), websiteLd()]) }} />
      <Navbar />
      <main className="flex-1"><HomeV2 flags={flags} trial={trial} /></main>
      <Footer />
    </div>
  )
}
