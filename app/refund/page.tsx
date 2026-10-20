import { LegalPage } from '@/components/legal/legal-page'
import { COMPANY, COMPANY_LOCATION, PRODUCT, SUPPORT_EMAIL } from '@/lib/site'

export const metadata = { title: `Refund Policy | ${PRODUCT}` }

export default function RefundPage() {
  return (
    <LegalPage title="Refund Policy">
      <h2>14-day money-back guarantee</h2>
      <p>If {PRODUCT} isn&apos;t right for you, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> within 14 days of your first payment and we&apos;ll refund it in full. No questions asked.</p>
      <h2>Renewals</h2>
      <ul>
        <li>Monthly renewals are not refunded, but you can cancel any time and keep access until the end of the month you paid for.</li>
        <li>Yearly and Founding renewals can be refunded if you ask within 14 days of the renewal charge.</li>
      </ul>
      <h2>If your account isn&apos;t activated</h2>
      <p>Paid access is turned on by hand after we confirm payment, usually the same day. If you paid and your account isn&apos;t active within 2 business days, email us and we&apos;ll activate it or refund you in full.</p>
      <h2>How refunds are paid</h2>
      <p>Refunds go back to the original payment method through Stripe and usually appear in 5 to 10 business days.</p>
      <p>{COMPANY}, {COMPANY_LOCATION}.</p>
    </LegalPage>
  )
}
