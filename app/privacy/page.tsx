import { LegalPage } from '@/components/legal/legal-page'
import { COMPANY, COMPANY_LOCATION, PRODUCT, SUPPORT_EMAIL } from '@/lib/site'

export const metadata = { title: `Privacy Policy | ${PRODUCT}` }

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>{COMPANY} ({COMPANY_LOCATION}) runs {PRODUCT}. This policy explains what we collect and why.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data:</strong> your email address and an encrypted password, stored with our database provider, Supabase.</li>
        <li><strong>Your funnels:</strong> the content you create and any files you upload.</li>
        <li><strong>Leads:</strong> details that visitors submit on your published funnels (for example name, email, phone, message). You control this data; we store it on your behalf.</li>
        <li><strong>Payments:</strong> handled by Stripe. We never see or store your full card number. We receive your email, plan and payment status.</li>
        <li><strong>Security:</strong> sign-up forms use Cloudflare Turnstile to block bots, and basic server logs (IP address, browser) are kept for security.</li>
      </ul>
      <h2>How we use it</h2>
      <p>To run your account, publish your funnels, deliver leads to you, process payments, prevent abuse, and answer support requests. We do not sell personal data and do not use it for advertising.</p>
      <h2>Sharing</h2>
      <p>Only with the providers that run the service (Supabase, Stripe, Cloudflare), or when the law requires it.</p>
      <h2>Retention and your choices</h2>
      <p>We keep data while your account is open. Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> to export or delete your account and data; deletion removes your funnels and leads.</p>
      <h2>Contact</h2>
      <p>{COMPANY}, {COMPANY_LOCATION}. Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
    </LegalPage>
  )
}
