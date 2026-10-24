import { Navbar } from '@/components/nav/navbar'
import { Footer } from '@/components/nav/footer'
import { PricingPlans } from '@/components/pricing-plans'
import { ToolsList } from '@/components/tools/tools-list'

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <section className="container mx-auto px-4 py-20 flex-1">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">SaaS Nation pricing</h1>
          <p className="text-xl text-muted-foreground">One plan, everything included. Pick how you want to pay. 14-day money-back guarantee.</p>
        </div>
        <ToolsList />
        <PricingPlans />
        <p className="text-center text-sm text-muted-foreground mt-10">
          Payments are handled securely by Stripe for CF LLC. Create your account, then pay with the same email.
          Publishing turns on once we confirm your payment, usually the same day (within 2 business days at most).
          Cancel any time by emailing support.
        </p>
      </section>
      <Footer />
    </div>
  )
}
