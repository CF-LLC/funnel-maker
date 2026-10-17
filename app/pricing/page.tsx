import { Navbar } from '@/components/nav/navbar'
import { Footer } from '@/components/nav/footer'
import { PricingPlans } from '@/components/pricing-plans'

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <section className="container mx-auto px-4 py-20 flex-1">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple pricing</h1>
          <p className="text-xl text-muted-foreground">One plan, everything included. No free plan; accounts are approved by hand within 24 hours.</p>
        </div>
        <PricingPlans />
        <p className="text-center text-sm text-muted-foreground mt-10">
          Payments are handled by Stripe for CF LLC. Your account is activated once we confirm payment (usually same day).
        </p>
      </section>
      <Footer />
    </div>
  )
}
