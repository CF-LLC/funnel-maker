import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/landing-shell'
import { ACCESS_LINE, COMPARE, PRICE_FAQ, comparePath, landingPath } from '@/lib/landing/registry'

export const metadata: Metadata = { title: COMPARE.title, description: COMPARE.description, alternates: { canonical: comparePath(COMPARE.slug) }, openGraph: { title: COMPARE.title, description: COMPARE.description, url: comparePath(COMPARE.slug), type: 'article' } }

const ROWS: [string, string, string][] = [
  ['Booking page', 'Calendly', 'Booking: weekly hours, meeting types, no double bookings, .ics invites'],
  ['Link-in-bio page', 'Linktree', 'Link-in-bio: your links and published funnels, with click counts'],
  ['Intake forms', 'Typeform', 'Forms: public form page, CSV export, funnel embeds'],
]

export default function Page() {
  return (
    <LandingShell eyebrow="Comparison" h1={COMPARE.h1} description={COMPARE.description} colors={['#7c3aed', '#06b6d4']} faqs={[PRICE_FAQ]}>
      <p>Many coaches use a separate app for each small job: Calendly for booking, Linktree for a link-in-bio page and Typeform for intake forms. Those are mature, well-known products with more features than SaaS Nation in their own areas. SaaS Nation covers the basics of all three, plus invoices, proposals and more, in one account.</p>
      <h2>Side by side</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-white/10 text-white"><th className="py-2 pr-4">Job</th><th className="py-2 pr-4">Separate app</th><th className="py-2">In SaaS Nation</th></tr></thead>
          <tbody>{ROWS.map((r) => <tr key={r[0]} className="border-b border-white/5"><td className="py-2 pr-4">{r[0]}</td><td className="py-2 pr-4">{r[1]}</td><td className="py-2">{r[2]}</td></tr>)}</tbody>
        </table>
      </div>
      <h2>Price</h2>
      <p>All Access is $29/mo or $249/yr and includes every SaaS Nation tool, including future ones. One tool on its own is $12/mo or $99/yr. {ACCESS_LINE} For each separate app’s current price, check its own pricing page.</p>
      <h2>When to pick which</h2>
      <ul>
        <li><strong>Pick the separate apps</strong> if you need features beyond the basics listed above.</li>
        <li><strong>Pick SaaS Nation</strong> if you want simple versions of these jobs in one place, with one login and one bill.</li>
      </ul>
      <p>Read more: <Link href={landingPath('booking-page-without-calendly')} className="underline">Booking</Link>, <Link href={landingPath('link-in-bio')} className="underline">Link-in-bio</Link>, <Link href={landingPath('intake-form-for-coaching-clients')} className="underline">Forms</Link>, or <Link href="/pricing" className="underline">see pricing</Link>.</p>
    </LandingShell>
  )
}
