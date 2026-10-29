import { SOCIAL_PROOF, type SocialProof } from '@/lib/home/social-proof'

/** Renders nothing until lib/home/social-proof.ts has real entries. */
export function SocialProofSlot({ data = SOCIAL_PROOF }: { data?: SocialProof }) {
  const stats = data.stats.filter((s) => s.value.trim() && s.label.trim())
  const quotes = data.quotes.filter((q) => q.quote.trim() && q.name.trim())
  if (stats.length === 0 && quotes.length === 0) return null
  return (
    <section aria-label="What people say" className="px-4 py-10 sm:px-8" data-social-proof>
      {stats.length > 0 && (
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => <div key={s.label} className="rounded-xl border border-white/10 p-4"><dt className="text-xs text-zinc-400">{s.label}</dt><dd className="text-2xl font-black text-white">{s.value}</dd></div>)}
        </dl>
      )}
      {quotes.length > 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {quotes.map((q) => <figure key={q.name + q.quote.slice(0, 20)} className="rounded-xl border border-white/10 p-5"><blockquote className="text-zinc-200">&ldquo;{q.quote}&rdquo;</blockquote><figcaption className="mt-2 text-sm text-zinc-400">{q.name}{q.role ? `, ${q.role}` : ''}</figcaption></figure>)}
        </div>
      )}
    </section>
  )
}
