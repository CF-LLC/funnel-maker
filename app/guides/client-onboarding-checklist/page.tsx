import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideShell } from '@/components/guides/guide-shell'
import { getGuide, guidePath } from '@/lib/guides/registry'

const g = getGuide('client-onboarding-checklist')!
export const metadata: Metadata = { title: { absolute: g.title }, description: g.description, alternates: { canonical: guidePath(g.slug) }, openGraph: { title: g.h1, description: g.description, url: guidePath(g.slug), type: 'article' } }

export default function Page() {
  return (
    <GuideShell g={g}>
      <p>A good onboarding makes a new client feel looked after and saves you chasing details for weeks. Use this checklist as a starting point and cut what doesn’t fit your work.</p>
      <h2>Before work starts</h2>
      <ul>
        <li>Send a short welcome: what happens next, who to contact, and how quickly you usually reply.</li>
        <li>Confirm the scope in writing (a proposal or a short summary they agree to).</li>
        <li>Send the first invoice or deposit, if you take one. The <Link href={g.freeTool.href} className="underline">free invoice generator</Link> works for one-offs.</li>
        <li>Agree how changes and extra requests will be handled and priced.</li>
      </ul>
      <h2>Collect what you need</h2>
      <ul>
        <li>Main contact name, email and the best way to reach them.</li>
        <li>Logins or access you’ll need (ask them to share access, rather than send passwords by email).</li>
        <li>Brand files: logo, colours, fonts, existing copy and examples they like.</li>
        <li>Key dates: launch, events or anything with a fixed deadline.</li>
        <li>Billing details: who pays, and the company name and address for invoices.</li>
      </ul>
      <h2>Set expectations</h2>
      <ul>
        <li>Your working hours and response times.</li>
        <li>How feedback and approvals will work, and how many rounds are included.</li>
        <li>Where files and updates will live, so nothing gets lost in email.</li>
      </ul>
      <h2>Kick-off</h2>
      <ul>
        <li>Book a short kick-off call and send a summary afterwards.</li>
        <li>Share the first milestone and when they’ll see something.</li>
      </ul>
      <h2>Keep it all in one place for the client</h2>
      <p>A checklist works best when the client can see it too. <Link href={g.tool.href} className="underline">Client portal</Link> gives each client one private page with an onboarding checklist they can tick off, plus files you share and their invoices, proposals and bookings from your other SaaS Nation tools. There’s no client login: you share the link yourself, and you can turn it off at any time.</p>
    </GuideShell>
  )
}
