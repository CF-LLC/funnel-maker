import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideShell } from '@/components/guides/guide-shell'
import { getGuide, guidePath } from '@/lib/guides/registry'

const g = getGuide('overdue-invoice-email-templates')!
export const metadata: Metadata = { title: { absolute: g.title }, description: g.description, alternates: { canonical: guidePath(g.slug) }, openGraph: { title: g.h1, description: g.description, url: guidePath(g.slug), type: 'article' } }
const Tpl = ({ children }: { children: React.ReactNode }) => <pre className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/40 p-4 font-sans text-sm text-zinc-200">{children}</pre>

export default function Page() {
  return (
    <GuideShell g={g}>
      <p>Most late invoices aren’t a refusal to pay. They’re forgotten, stuck in an approval queue or sent to the wrong person. A short, predictable sequence of follow-ups fixes most of them without any awkwardness. Here are three emails you can copy, plus a few rules for late fees.</p>
      <h2>1. Friendly nudge (a day or two after the due date)</h2>
      <Tpl>{`Hi [Name],

Just a quick note that invoice [#] for [amount] was due on [date]. It may have slipped through the cracks. Could you take a look when you get a moment?

Thanks,
[You]`}</Tpl>
      <h2>2. Firm follow-up (about a week later)</h2>
      <Tpl>{`Hi [Name],

Following up on invoice [#] for [amount], now [X] days past due. Please arrange payment within 7 days, or reply with a payment date if there's an issue.

Thanks,
[You]`}</Tpl>
      <h2>3. Final notice (about two weeks later)</h2>
      <Tpl>{`Hi [Name],

Final notice: invoice [#] for [amount] (due [date]) is [X] days past due. Please pay in full within 7 days of this message.

If payment isn't received, I'll pause further work and take next steps to recover the balance.

[You]`}</Tpl>
      <h2>Late fees: keep them fair and agreed</h2>
      <ul>
        <li><strong>Only charge what your contract or invoice terms say.</strong> A fee that appears for the first time in a follow-up is hard to enforce and sours the relationship.</li>
        <li><strong>Check local law.</strong> Many places cap late fees and interest. This guide is not legal advice.</li>
        <li><strong>Show the math.</strong> “1.5 percent a month on $1,200, 21 days late = $12.60” is easier to accept than a round number.</li>
      </ul>
      <p>The free <Link href={g.freeTool.href} className="underline">late invoice kit</Link> fills these templates in with your numbers, works out the fee and gives you a printable late notice. Nothing is stored or sent.</p>
      <h2>Keeping invoices in one place</h2>
      <p>If you’d rather see what’s overdue at a glance, <Link href={g.tool.href} className="underline">Invoices</Link> keeps your invoices and their status in one list. It doesn’t send reminders for you; you stay in control of what goes out.</p>
    </GuideShell>
  )
}
