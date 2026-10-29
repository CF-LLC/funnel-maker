import { madeWithHref, type Ref } from '@/lib/acquisition/core'

/** Small "Made with SaaS Nation" footer link on client-facing pages, tagged ?ref=<tool> for anonymous referral counts. */
export function MadeWith({ tool, className = 'text-zinc-500 hover:text-zinc-300' }: { tool: Ref; className?: string }) {
  return (
    <footer className="pb-8 pt-4 text-center text-xs">
      <a href={madeWithHref(tool)} target="_blank" rel="noopener" className={`${className} transition`}>Made with <span className="font-semibold">SaaS Nation</span></a>
    </footer>
  )
}
