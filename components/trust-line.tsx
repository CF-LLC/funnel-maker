import Link from 'next/link'
import { ShieldCheck, MapPin } from 'lucide-react'
import { COMPANY, COMPANY_STATE, REFUND_PROMISE } from '@/lib/site'

/** Honest trust signals only: who builds it and the refund policy the /refund page actually states. No testimonials, ratings or counts. */
export function TrustLine({ className = '' }: { className?: string }) {
  return (
    <div data-trust-line className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground ${className}`}>
      <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" aria-hidden="true" />Built by {COMPANY} in {COMPANY_STATE}</span>
      <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />{REFUND_PROMISE}. <Link href="/refund" className="underline hover:text-foreground">Refund Policy</Link></span>
    </div>
  )
}
