import { Navbar } from '@/components/nav/navbar'
import { Footer } from '@/components/nav/footer'
import { LEGAL_UPDATED } from '@/lib/site'

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-16 flex-1 max-w-3xl">
        <h1 className="text-4xl font-bold mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated {LEGAL_UPDATED}</p>
        <div className="space-y-6 leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:text-primary [&_a]:underline">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  )
}
