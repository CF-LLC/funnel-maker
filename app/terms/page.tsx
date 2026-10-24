import Link from 'next/link'
import { LegalPage } from '@/components/legal/legal-page'
import { COMPANY, COMPANY_LOCATION, PRODUCT, SUPPORT_EMAIL } from '@/lib/site'

export const metadata = { title: `Terms of Service | ${PRODUCT}` }

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>These terms cover your use of {PRODUCT} (saasnation.site), including its tools (Funnels, Invoices, Link-in-bio, Forms, Proposals and Testimonials), operated by {COMPANY}, {COMPANY_LOCATION}. By creating an account or paying for a plan you agree to them.</p>
      <h2>Accounts</h2>
      <ul>
        <li>You must give a real email address and keep your password private. You are responsible for activity on your account.</li>
        <li>New accounts are reviewed by hand. We may decline or close accounts that break these terms.</li>
      </ul>
      <h2>Plans and billing</h2>
      <ul>
        <li>You can subscribe to single tools or to All Access, monthly or yearly, at the prices shown on the <Link href="/pricing">pricing page</Link> when you subscribe. Prices are in US dollars.</li>
        <li>Payments are processed by Stripe. Plans renew automatically until you cancel. You can cancel any time, and no further charges are made after you cancel, by emailing <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>; access continues until the end of the paid period. When a subscription ends, access to that tool stops, but your saved content is kept unless you ask us to delete it.</li>
        <li>Paid access is activated after we confirm your payment, usually the same day. See the <Link href="/refund">Refund Policy</Link>.</li>
      </ul>
      <h2>Your content</h2>
      <ul>
        <li>You own the funnels, pages, forms, invoices, proposals, reviews, text, images and leads you put into {PRODUCT}. You give us permission to host and display them so the service works.</li>
        <li>Reviews you display must come from real clients; you must not write fake reviews.</li>
        <li>You must have the right to use everything you publish, and you are responsible for complying with marketing, privacy and anti-spam laws when you collect leads.</li>
        <li>No illegal content, scams, malware, phishing, adult content, or content that infringes someone else&apos;s rights. We may unpublish content that break this rule.</li>
      </ul>
      <h2>Service</h2>
      <ul>
        <li>We work to keep {PRODUCT} available but provide it &quot;as is&quot; without warranties. We may change or discontinue features with reasonable notice.</li>
        <li>To the extent the law allows, {COMPANY}&apos;s total liability is limited to the amount you paid in the 12 months before the claim.</li>
      </ul>
      <h2>Changes and law</h2>
      <p>We may update these terms and will note the date above. These terms are governed by the laws of the State of Arkansas, USA.</p>
      <h2>Contact</h2>
      <p>{COMPANY}, {COMPANY_LOCATION}. Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
    </LegalPage>
  )
}
