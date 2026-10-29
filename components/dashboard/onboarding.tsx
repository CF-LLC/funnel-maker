'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'

export type Step = { id: string; label: string; hint: string; href: string; done: boolean }

/** Getting-started checklist. Hidden when every step is done or the user dismisses it (remembered on this device). */
export function OnboardingChecklist({ steps }: { steps: Step[] }) {
  const [hidden, setHidden] = useState(false)
  useEffect(() => { try { setHidden(localStorage.getItem('sn_onboarding_hidden') === '1') } catch {} }, [])
  const done = steps.filter((s) => s.done).length
  if (hidden || done === steps.length) return null
  return (
    <section data-onboarding aria-label="Getting started" className="mx-4 rounded-2xl bg-[#121217]/95 p-4 text-zinc-100 ring-1 ring-white/10 sm:mx-8 sm:p-5">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Get started</h2>
        <span className="text-xs text-zinc-500">{done} of {steps.length} done</span>
        <button onClick={() => { setHidden(true); try { localStorage.setItem('sn_onboarding_hidden', '1') } catch {} }} className="ml-auto min-h-[44px] px-2 text-xs text-zinc-400 hover:text-white">Hide</button>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.id}>
            <Link href={s.href} data-step={s.id} data-done={s.done ? '1' : '0'} className={`press flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 ring-1 ${s.done ? 'bg-white/[0.02] text-zinc-500 ring-white/5' : 'bg-white/[0.05] ring-white/10 hover:bg-white/10'}`}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${s.done ? 'bg-emerald-500 text-black' : 'ring-1 ring-white/30'}`}>{s.done && <Check className="h-4 w-4" />}</span>
              <span className="min-w-0"><span className={`block text-sm font-semibold ${s.done ? 'line-through' : ''}`}>{s.label}</span><span className="block truncate text-xs text-zinc-400">{s.hint}</span></span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
