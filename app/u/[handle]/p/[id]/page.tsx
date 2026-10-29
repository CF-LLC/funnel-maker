import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPublicProposal } from '@/lib/proposals/public'
import { effectiveStatus, STATUS_LABELS, STATUS_STYLES } from '@/lib/proposals/core'
import { formatCurrency, totals } from '@/lib/invoices/core'
import { getEmbed } from '@/lib/testimonials/public'
import { ReviewList } from '@/components/testimonials/review-list'
import { ProposalResponse } from '@/components/proposals/public-response'
import { DemoBanner } from '@/components/demo-banner'
import { isDemoUser } from '@/lib/demo'
import { MadeWith } from '@/components/made-with'

export const dynamic = 'force-dynamic'
type P = { params: Promise<{ handle: string; id: string }> }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { handle, id } = await params
  const p = await getPublicProposal(handle, id)
  return p ? { title: p.title, robots: { index: false } } : { title: 'This page is unavailable.', robots: { index: false } }
}

export default async function PublicProposalPage({ params }: P) {
  const { handle, id } = await params
  const p = await getPublicProposal(handle, id)
  if (!p) notFound()
  const demo = isDemoUser(p.user_id)
  const s = effectiveStatus(p)
  const t = totals(p.lines, null)
  const reviews = await getEmbed(p.user_id, p.handle, 'proposals_layout')
  const when = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Chicago', dateStyle: 'long' })
  return (
    <>{demo && <DemoBanner />}
    <div className="min-h-screen bg-app flex flex-col items-center px-4 py-12">
      <main className="mx-auto w-full max-w-2xl space-y-6 rounded-xl border bg-background p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm text-muted-foreground">Proposal{p.seller_name ? ` from ${p.seller_name}` : ''} for {p.client_name}</p>
            <h1 className="text-2xl font-bold">{p.title}</h1>
          </div>
          <span className={`rounded-full px-2 text-xs ${STATUS_STYLES[s]}`}>{STATUS_LABELS[s]}</span>
        </div>
        {p.intro && <p className="whitespace-pre-line">{p.intro}</p>}
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left"><th className="py-2">Item</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Price</th><th className="py-2 text-right">Amount</th></tr></thead>
          <tbody>{p.lines.map((l, i) => (
            <tr key={i} className="border-b"><td className="py-2">{l.description}</td><td className="py-2 text-right">{l.quantity}</td>
              <td className="py-2 text-right">{formatCurrency(l.unit_price_cents, p.currency)}</td><td className="py-2 text-right">{formatCurrency(Math.round(l.quantity * l.unit_price_cents), p.currency)}</td></tr>))}
          </tbody>
          <tfoot><tr><td colSpan={3} className="py-2 text-right font-semibold">Total</td><td className="py-2 text-right font-bold">{formatCurrency(t.total, p.currency)}</td></tr></tfoot>
        </table>
        {p.expires_on && <p className="text-sm text-muted-foreground">Valid through {when(p.expires_on + 'T12:00:00Z')}.</p>}
        {s === 'sent' && <ProposalResponse handle={p.handle} id={p.id} demo={demo} />}
        {s === 'accepted' && <p role="status" className="rounded-xl border bg-green-50 p-4 text-green-900">Accepted by {p.accepted_name} on {when(p.responded_at!)}.</p>}
        {s === 'declined' && <p role="status" className="rounded-xl border bg-red-50 p-4 text-red-900">This proposal was declined on {when(p.responded_at!)}.</p>}
        {s === 'expired' && <p role="status" className="rounded-xl border bg-amber-50 p-4 text-amber-900">This proposal has expired. Contact the sender for an updated one.</p>}
        {reviews && <section className="space-y-3"><h2 className="text-lg font-semibold">What clients say</h2><ReviewList reviews={reviews.reviews} layout={reviews.layout} handle={reviews.handle} /></section>}
      </main>
      <MadeWith tool="proposals" className="text-muted-foreground hover:underline" />
    </div>
    </>
  )
}
