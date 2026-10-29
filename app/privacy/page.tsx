import { LegalPage } from '@/components/legal/legal-page'
import { COMPANY, COMPANY_LOCATION, PRODUCT, SUPPORT_EMAIL } from '@/lib/site'

export const metadata = { title: `Privacy Policy | ${PRODUCT}`, alternates: { canonical: '/privacy' } }

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>{COMPANY} ({COMPANY_LOCATION}) runs {PRODUCT}. This policy explains what we collect and why.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data:</strong> your email address and an encrypted password, stored with our database provider, Supabase.</li>
        <li><strong>Your content:</strong> funnels, Link-in-bio pages, forms, clients, invoices, proposals, testimonials and any files you upload, all stored in Supabase.</li>
        <li><strong>Leads:</strong> details that visitors submit on your published funnels and forms, and names, ratings and photos clients submit in reviews or when accepting a proposal (for example name, email, phone, message). You control this data; we store it on your behalf.</li>
        <li><strong>Payments:</strong> handled by Stripe. We never see or store your full card number. We receive your email, plan and payment status.</li>
        <li><strong>Visit counts:</strong> on public pages we set one anonymous first-party cookie, <code>sn_vid</code> (a random ID, kept 90 days), and record which pages and free tools were opened plus any UTM campaign tags. It holds no email or IP address and nothing you type into a tool. We skip it when your browser sends Do Not Track.</li>
        <li><strong>Security:</strong> sign-up forms use Cloudflare Turnstile to block bots, and basic server logs (IP address, browser) are kept for security.</li>
      </ul>
      <h2>How we use it</h2>
      <p>To run your account, publish your pages, deliver leads to you, process payments, prevent abuse, and answer support requests. We do not sell personal data and do not use it for advertising.</p>
      <h2>Sharing</h2>
      <p>Only with the providers that run the service (Supabase, Stripe, Cloudflare), or when the law requires it.</p>
      <h2>Retention and your choices</h2>
      <p>We keep data while your account is open. Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> to export or delete your account and data; deletion removes your content and leads.</p>
      <h2>Contact</h2>
      <p>{COMPANY}, {COMPANY_LOCATION}. Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
    </LegalPage>
  )
}
