'use client'
import { useState } from 'react'

/** Read-only template block with a Copy button. Text is fully in the HTML so search engines and no-JS readers see it. */
export function CopyTemplate({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative">
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/40 p-4 pr-20 font-mono text-[13px] leading-relaxed text-zinc-200">{text}</pre>
      <button type="button" onClick={() => { navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {}) }} className="absolute right-3 top-3 rounded-full border border-white/15 bg-zinc-900 px-3 py-1 text-xs font-semibold text-white hover:border-white/40">{copied ? 'Copied' : 'Copy'}</button>
    </div>
  )
}
