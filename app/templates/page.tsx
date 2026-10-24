import { Navbar } from '@/components/nav/navbar'
import { Footer } from '@/components/nav/footer'
import { TemplatePicker } from '@/components/templates/template-picker'

export default function TemplatesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-app">
      <Navbar />
      <section className="container mx-auto flex-1 px-4 py-14 sm:py-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Templates that <span className="text-brand">wow</span></h1>
          <p className="mt-4 text-lg text-muted-foreground">Animated gradients, starfields, glass and parallax. Fast on every phone, and calm for people who prefer less motion.</p>
        </div>
        <TemplatePicker returnTo="/funnels/templates" />
      </section>
      <Footer />
    </div>
  )
}
