import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideShell } from '@/components/guides/guide-shell'
import { getGuide, guidePath } from '@/lib/guides/registry'

const g = getGuide('how-to-get-client-design-approval')!
export const metadata: Metadata = { title: { absolute: g.title }, description: g.description, alternates: { canonical: guidePath(g.slug) }, openGraph: { title: g.h1, description: g.description, url: guidePath(g.slug), type: 'article' } }

export default function Page() {
  return (
    <GuideShell g={g}>
      <p>Most approval delays aren’t about the work. They come from unclear asks: the client isn’t sure which file is current, feedback is split across email and chat, and nobody ever says “approved” in so many words. Here’s a simple process that fixes that.</p>
      <h2>1. Agree what “approved” means up front</h2>
      <p>Before you share anything, say how sign-off works: “When it’s right, click Approve. If not, tell me what to change.” Mention how many rounds of changes your price includes, if any.</p>
      <h2>2. Send one thing, clearly labelled</h2>
      <ul>
        <li>Number every version: <strong>v1, v2, v3</strong>. Never “final_final2”.</li>
        <li>Share one link that always shows the latest version, so nobody reviews an old file.</li>
        <li>Add a one-line note of what changed since the last version.</li>
      </ul>
      <h2>3. Ask a specific question</h2>
      <p>“Thoughts?” invites open-ended feedback. Try: “Does this match the brief? If yes, click Approve; if not, list the changes you need.” Asking for a decision gets a decision.</p>
      <h2>4. Keep feedback in one place</h2>
      <p>Ask the client to comment where the design lives rather than in separate emails. Reply there too, so the reasoning stays attached to the version it was about.</p>
      <h2>5. Record the decision</h2>
      <p>When the client approves, keep a record of who approved which version and when. If questions come up later, you can point to it rather than digging through threads.</p>
      <h2>6. Make the follow-up easy</h2>
      <p>If you haven’t heard back, a short nudge with the same link works better than re-attaching files. A clear subject line and a good <Link href={g.freeTool.href} className="underline">email signature</Link> with your contact details help too.</p>
      <h2>A tool that does exactly this</h2>
      <p><Link href={g.tool.href} className="underline">Approval link</Link> gives each piece of work one private link. You upload an image or PDF, or paste a link to a video hosted elsewhere (YouTube, Vimeo, Loom and similar); each upload becomes v1, v2 and so on. Your client sees the latest version, leaves comments, and clicks Approve or Request changes; their name and the time are recorded. It doesn’t send reminders for you and isn’t an e-signature tool; you share the link yourself.</p>
    </GuideShell>
  )
}
