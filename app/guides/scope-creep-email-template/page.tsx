import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideShell } from '@/components/guides/guide-shell'
import { getGuide, guidePath } from '@/lib/guides/registry'

const g = getGuide('scope-creep-email-template')!
export const metadata: Metadata = { title: { absolute: g.title }, description: g.description, alternates: { canonical: guidePath(g.slug) }, openGraph: { title: g.h1, description: g.description, url: guidePath(g.slug), type: 'article' } }
const Tpl = ({ children }: { children: React.ReactNode }) => <pre className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/40 p-4 font-sans text-sm text-zinc-200">{children}</pre>

export default function Page() {
  return (
    <GuideShell g={g}>
      <p>Scope creep rarely arrives as a big request. It’s usually “could you also…” in the middle of a thread. The fix isn’t saying no; it’s making every extra visible, priced and agreed <strong>before</strong> you do it. Below are three short templates you can copy and adapt.</p>
      <h2>1. The friendly “happy to, here’s what it adds” reply</h2>
      <Tpl>{`Hi [Name],

Happy to add [the extra]. It isn't part of what we agreed for [project], so here's what it would add:

• What: [one-line description]
• Estimate: [X hours at your rate / a fixed price]
• Timing: [any effect on the deadline]

Reply "OK" and I'll add it to the project and the next invoice. If you'd rather keep to the original scope, that's completely fine too.

Thanks,
[You]`}</Tpl>
      <h2>2. When several small extras have piled up</h2>
      <Tpl>{`Hi [Name],

A few extra requests have come up since we started, which is great. To keep things clear, here they are in one list:

1. [Extra] – [estimate]
2. [Extra] – [estimate]
3. [Extra] – [estimate]

Could you tell me which ones you'd like me to go ahead with? I'll only start on the ones you OK.

Thanks,
[You]`}</Tpl>
      <h2>3. When the extra changes the deadline</h2>
      <Tpl>{`Hi [Name],

Yes, I can do [the extra]. It needs about [time], so the delivery date would move from [date] to [date], and it adds [price].

Alternatively, I can deliver the original scope on [date] and pick this up straight after as a separate piece.

Which works better for you?

[You]`}</Tpl>
      <h2>Tips that make these land well</h2>
      <ul>
        <li><strong>Reply quickly and warmly.</strong> The aim is a clear decision, not a negotiation.</li>
        <li><strong>Always give a number.</strong> Hours times your rate, or a fixed price. If you’re unsure of your rate, the <Link href={g.freeTool.href} className="underline">hourly rate calculator</Link> helps.</li>
        <li><strong>Get the yes in writing</strong> and keep it with the project, so nobody is surprised when the invoice arrives.</li>
        <li><strong>Keep one running list</strong> per client rather than decisions scattered across email, chat and calls.</li>
      </ul>
      <h2>Keeping the list in one place</h2>
      <p>If you’d rather not track this in email, <Link href={g.tool.href} className="underline">Change log</Link> gives each client one private link listing their extra requests with your estimate. They tap “OK, add it” or “No thanks”, and their name and the time are recorded. Approved extras can be added to an invoice in SaaS Nation Invoices. It doesn’t send emails for you; you share the link yourself.</p>
    </GuideShell>
  )
}
