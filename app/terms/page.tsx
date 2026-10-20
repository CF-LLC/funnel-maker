import Link from 'next/link'
import { LegalPage } from '@/components/legal/legal-page'
import { COMPANY, COMPANY_LOCATION, PRODUCT, SUPPORT_EMAIL } from '@/lib/site'

export const metadata = { title: `Terms of Service | ${PRODUCT}` }

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>These terms cover your use of {PRODUCT} (funnels.saasnation.site), operated by {COMPANY}, {COMPANY_LOCATION}. By creating an account or paying for a plan you agree to them.</p>
      <h2>Accounts</h2>
      <ul>
        <li>You must give a real email address and keep your password private. You are responsible for activity on your account.</li>
        <li>New accounts are reviewed by hand. We may decline or close accounts that break these terms.</li>
      </ul>
      <h2>Plans and billing</h2>
      <ul>
        <li>Paid plans are Monthly ($12/month), Yearly ($99/year) and Founding member ($79 for the first year, then $99/year). Prices are in US dollars.</li>
        <li>Payments are processed by Stripe. Plans renew automatically until you cancel. You can cancel any time by emailing <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>; access continues until the end of the paid period.</li>
        <li>Paid access is activated after we confirm your payment, usually the same day. See the <Link href="/refund">Refund Policy</Link>.</li>
      </ul>
      <h2>Your content</h2>
      <ul>
        <li>You own the funnels, text, images and leads you put into {PRODUCT}. You give us permission to host and display them so the service works.</li>
        <li>You must have the right to use everything you publish, and you are responsible for complying with marketing, privacy and anti-spam laws when you collect leads.</li>
        <li>No illegal content, scams, malware, phishing, adult content, or content that infringes someone else&apos;s rights. We may unpublish funnels that break this rule.</li>
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
