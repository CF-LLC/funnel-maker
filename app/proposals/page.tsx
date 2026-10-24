import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import { totals, formatCurrency } from '@/lib/invoices/core'
import { effectiveStatus, publicProposalPath, STATUS_LABELS, STATUS_STYLES } from '@/lib/proposals/core'

export const dynamic = 'force-dynamic'

export default async function ProposalsHome() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const db = supabase as any
  const [{ data: rows }, { data: profile }] = await Promise.all([
    db.from('prp_proposals').select('id, title, client_name, status, expires_on, currency, created_at, invoice_id, prp_proposal_lines(quantity, unit_price_cents)')
      .eq('user_id', user!.id).order('created_at', { ascending: false }).limit(200),
    db.from('lib_profiles').select('handle').eq('user_id', user!.id).maybeSingle(),
  ])
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Proposals</h1>
        <Link href="/proposals/new" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">New proposal</Link></div>
      {!profile?.handle && <p className="rounded-xl border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">Public proposal pages use your handle (saasnation.site/@handle/p/…). <Link href="/links" className="underline">Set your handle in Link-in-bio</Link>.</p>}
      <ul className="divide-y rounded-xl border bg-background">
        {(rows || []).map((p: any) => {
          const s = effectiveStatus(p)
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-3 p-4">
              <Link href={`/proposals/${p.id}`} className="font-semibold hover:underline">{p.title}</Link>
              <span className="text-sm text-muted-foreground">{p.client_name}</span>
              <span className={`rounded-full px-2 text-xs ${STATUS_STYLES[s]}`}>{STATUS_LABELS[s]}</span>
              {p.invoice_id && <Link href={`/invoices/${p.invoice_id}`} className="text-xs text-primary hover:underline">Invoice ↗</Link>}
              {profile?.handle && s !== 'draft' && <a href={publicProposalPath(profile.handle, p.id)} target="_blank" className="text-xs text-primary hover:underline">Public page ↗</a>}
              <span className="ml-auto text-sm">{formatCurrency(totals(p.prp_proposal_lines || [], null).total, p.currency)}</span>
            </li>
          )
        })}
        {!rows?.length && <li className="p-4 text-sm text-muted-foreground">No proposals yet.</li>}
      </ul>
    </div>
  )
}
