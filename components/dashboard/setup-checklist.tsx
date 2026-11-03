import Link from 'next/link'
import { Check, Lock } from 'lucide-react'
import { setupComplete, type SetupStep } from '@/lib/me/setup-core'

/** "Get set up" (workspace_v2). Steps tick from real data; the card disappears once all 4 are done. Collapsible. */
export function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  if (setupComplete(steps)) return null
  const done = steps.filter((s) => s.done).length
  return (
    <section aria-labelledby="setup-h" className="px-4 pt-4 sm:px-8" data-setup>
      <details open className="group rounded-2xl bg-[#121217] p-4 ring-1 ring-white/10">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-3">
          <h2 id="setup-h" className="text-lg font-bold text-white">Get set up</h2>
          <span className="text-xs text-zinc-400" data-setup-count>{done} of {steps.length} done</span>
          <span className="ml-auto text-xs text-zinc-400 group-open:hidden">Show</span>
          <span className="ml-auto hidden text-xs text-zinc-400 group-open:inline">Hide</span>
        </summary>
        <ol className="mt-3 space-y-2">
          {steps.map((s, i) => (
            <li key={s.id} data-setup-step={s.id} data-done={s.done ? '1' : '0'} data-locked={s.locked ? '1' : '0'}>
              <Link href={s.href} className={`press flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 ring-1 ${s.done ? 'text-zinc-500 ring-white/5' : 'bg-white/[0.05] ring-white/10 hover:bg-white/10'}`}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${s.done ? 'bg-emerald-500 text-black' : 'text-zinc-300 ring-1 ring-white/30'}`}>{s.done ? <Check className="h-4 w-4" /> : i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold ${s.done ? 'line-through' : 'text-white'}`}>{s.label}</span>
                  {!s.done && <span className="block text-xs text-zinc-400">{s.hint}</span>}
                </span>
                {!s.done && <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-zinc-300">{s.locked && <Lock className="h-3 w-3" />}{s.cta} →</span>}
              </Link>
            </li>
          ))}
        </ol>
      </details>
    </section>
  )
}
