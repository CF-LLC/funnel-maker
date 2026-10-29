'use client'

import { useState } from 'react'
import { ToolRow } from '@/components/showcase/tool-row'
import type { ShowcaseCard } from '@/components/showcase/types'

export type PickerKey = 'all' | 'coaches' | 'creators' | 'everyone'
const TYPES: [Exclude<PickerKey, 'all'>, string][] = [['coaches', "I'm a coach"], ['creators', "I'm a creator"], ['everyone', 'Everyone else']]
const TITLES: Record<PickerKey, string> = { all: 'All tools', coaches: 'Tools for coaches', creators: 'Tools for creators', everyone: 'Tools for everyone' }

/** One tool list plus a "Pick your type" row that filters it (lists are pre-filtered on the server by launch flags). */
export function ToolPicker({ rows }: { rows: Record<PickerKey, ShowcaseCard[]> }) {
  const [pick, setPick] = useState<PickerKey>('all')
  return (
    <div id="tools" className="relative z-10 space-y-1 pb-10">
      <div className="px-4 sm:px-8">
        <p className="text-sm font-bold text-zinc-300">Pick your type</p>
        <div role="group" aria-label="Pick your type" className="mt-2 flex flex-wrap gap-2">
          {TYPES.filter(([k]) => rows[k].length > 0).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={pick === k} onClick={() => setPick(pick === k ? 'all' : k)}
              className={`min-h-[40px] rounded-full px-4 text-sm font-bold ring-1 transition ${pick === k ? 'bg-white text-black ring-white' : 'bg-white/5 text-white ring-white/20 hover:bg-white/15'}`}>{l}</button>
          ))}
        </div>
      </div>
      <ToolRow id={pick} title={TITLES[pick]} cards={rows[pick]} />
    </div>
  )
}
