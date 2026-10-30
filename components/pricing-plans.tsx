'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { ALL_ACCESS_PRICE, TOOL_PRICE, paymentLinkUrl, type Billing, type SoldKey } from '@/lib/plans'

const SINGLE: { id: Exclude<SoldKey, 'all'>; name: string }[] = [
  { id: 'funnels', name: 'Funnels' }, { id: 'invoices', name: 'Invoices' }, { id: 'forms', name: 'Forms' },
  { id: 'proposals', name: 'Proposals' }, { id: 'testimonials', name: 'Testimonials' }, { id: 'booking', name: 'Booking' },
  { id: 'dataremoval', name: 'Data Removal' }, { id: 'crm', name: 'CRM' },
  { id: 'emaillist', name: 'Email list' }, { id: 'downloads', name: 'Digital downloads' },
  { id: 'portal', name: 'Client portal' }, { id: 'changelog', name: 'Change log' }, { id: 'approvals', name: 'Approval link' },
  { id: 'time', name: 'Time tracking' },
]

/** Pre-launch tools appear in the Single dropdown only when their launch flag (<id>_public / NEXT_PUBLIC_<ID>_ENABLED) is on. */
const GATED: readonly string[] = ['crm', 'emaillist', 'downloads', 'portal', 'approvals', 'changelog', 'time']
/** Tools whose launch flag key differs from their id. */
const FLAG_OF: Partial<Record<string, string>> = { time: 'timetracking' }
export function singleTools(flags: Partial<Record<string, boolean>> = {}) {
  return SINGLE.filter((t) => !GATED.includes(t.id) || flags[FLAG_OF[t.id] || t.id])
}

function listNames(names: string[]) {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`
}

export function PricingPlans({ flags = {} }: { flags?: Partial<Record<string, boolean>> }) {
  const tools = singleTools(flags)
  const names = tools.map((t) => t.name)
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null)
  const [billing, setBilling] = useState<Billing>('monthly')
  const [tool, setTool] = useState<Exclude<SoldKey, 'all'>>('funnels')
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => data.user && setUser({ id: data.user.id, email: data.user.email }))
  }, [])
  const per = billing === 'monthly' ? '/mo' : '/yr'

  const cta = (key: SoldKey, label: string, primary: boolean) => {
    const cls = `block w-full rounded-full px-5 py-3 text-center font-semibold transition ${primary ? 'bg-primary text-primary-foreground hover:opacity-90' : 'border border-white/20 hover:border-white/60'}`
    if (!user) return <Link href="/auth/register" className={cls}>{label}</Link>
    const href = paymentLinkUrl(key, billing, user)
    return href ? <a href={href} className={cls}>{label}</a> : <span className={`${cls} opacity-50 cursor-not-allowed`}>Checkout opening soon</span>
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col items-center gap-2 mb-8">
        <div role="tablist" aria-label="Billing period" className="inline-flex rounded-full border border-white/15 p-1">
          {(['monthly', 'yearly'] as Billing[]).map((b) => (
            <button key={b} role="tab" aria-selected={billing === b} onClick={() => setBilling(b)}
              className={`rounded-full px-5 py-2 text-sm font-semibold ${billing === b ? 'bg-white text-black' : 'text-white/70'}`}>
              {b === 'monthly' ? 'Monthly' : 'Yearly'}{b === 'yearly' && <span className="ml-1 text-xs opacity-80">(save up to 28%)</span>}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Prices switch between monthly and yearly billing. Yearly is paid once a year.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-bold">Single tool</h2>
          <p className="mt-1 text-sm text-muted-foreground">Pick one tool. All of its features, nothing locked.</p>
          <div className="mt-4"><span className="text-4xl font-bold">{TOOL_PRICE[billing]}</span><span className="text-muted-foreground">{per}</span></div>
          <p className="text-xs text-muted-foreground h-4">{billing === 'yearly' ? 'Save $45 vs $144 paid monthly' : 'or $99/yr'}</p>
          <label className="mt-4 text-sm font-medium" htmlFor="tool-pick">Choose a tool</label>
          <select id="tool-pick" value={tool} onChange={(e) => setTool(e.target.value as typeof tool)}
            className="mt-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2">
            {tools.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <ul className="my-6 flex-1 space-y-3 text-sm">
            {[`Full access to one paid tool: ${listNames(names)}`, 'Link-in-bio included free (shows a small "Made with SaaS Nation" badge)', 'Email support'].map((f) => (
              <li key={f} className="flex gap-2"><Check className="h-5 w-5 shrink-0 text-primary" />{f}</li>
            ))}
          </ul>
          {cta(tool, `Get ${(tools.find((t) => t.id === tool) ?? tools[0]).name}`, false)}
        </div>
        <div className="relative flex flex-col rounded-2xl border-2 border-primary bg-primary/10 p-6 shadow-[0_0_60px_-20px] shadow-primary">
          <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">Recommended</span>
          <h2 className="text-xl font-bold">All Access</h2>
          <p className="mt-1 text-sm text-muted-foreground">Every tool we have, plus every tool we launch next.</p>
          <div className="mt-4"><span className="text-4xl font-bold">{ALL_ACCESS_PRICE[billing]}</span><span className="text-muted-foreground">{per}</span></div>
          <p className="text-xs text-muted-foreground h-4">{billing === 'yearly' ? 'Save $99 vs $348 paid monthly' : 'or $249/yr'}</p>
          <ul className="my-6 flex-1 space-y-3 text-sm">
            {[`${listNames(names).replace(/ or ([^,]+)$/, ' and $1')}`, 'Link-in-bio with no SaaS Nation badge', 'New tools included automatically, at no extra cost', 'Email support'].map((f) => (
              <li key={f} className="flex gap-2"><Check className="h-5 w-5 shrink-0 text-primary" />{f}</li>
            ))}
          </ul>
          {cta('all', 'Get All Access', true)}
        </div>
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">No free plan. Accounts are approved by hand within 24 hours.</p>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        By paying you agree to our <Link href="/terms" className="underline">Terms</Link>, <Link href="/privacy" className="underline">Privacy Policy</Link> and <Link href="/refund" className="underline">Refund Policy</Link> (14-day money-back guarantee).
      </p>
    </div>
  )
}
