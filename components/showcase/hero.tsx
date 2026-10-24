import Link from 'next/link'
import { Play } from 'lucide-react'
import { Poster } from './poster'

/** Full-width cinematic hero featuring one tool (no rotation). */
export function Hero({ art, eyebrow, title, text, colors, shot, primary, secondary }: {
  art: string; eyebrow: string; title: string; text: string
  colors: { from: string; to: string; accent: string }; shot?: string
  primary: { href: string; label: string }; secondary?: { href: string; label: string }
}) {
  return (
    <section className="relative isolate overflow-hidden" data-hero={art}>
      <div aria-hidden className="absolute inset-0 -z-10" style={{ background: `radial-gradient(70% 90% at 85% 20%, ${colors.to}aa 0%, transparent 60%), linear-gradient(180deg, ${colors.from} 0%, #09090b 100%)` }} />
      <div aria-hidden className="absolute -right-10 top-10 -z-10 hidden w-[44%] max-w-[560px] rotate-[-4deg] overflow-hidden rounded-xl opacity-80 shadow-2xl ring-1 ring-white/15 md:block">
        {shot ? <img src={shot} alt="" className="aspect-[16/10] w-full object-cover object-top" /> : <div className="aspect-[16/10]"><Poster id={art} name={eyebrow} colors={colors} /></div>}
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-zinc-950/90 via-zinc-950/40 to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-zinc-950 to-transparent" />
      <div className="nf-fade-up px-4 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-24 lg:pb-32 lg:pt-32">
        <div className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: colors.accent }}>{eyebrow}</div>
        <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">{title}</h1>
        <p className="mt-4 max-w-xl text-base text-zinc-300 sm:text-lg">{text}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href={primary.href} className="press inline-flex min-h-[52px] items-center justify-center gap-2 rounded-md bg-white px-7 text-base font-bold text-black hover:bg-zinc-200">
            <Play className="h-5 w-5 fill-black" />{primary.label}
          </Link>
          {secondary && (
            <Link href={secondary.href} className="press inline-flex min-h-[52px] items-center justify-center rounded-md bg-white/15 px-7 text-base font-bold text-white backdrop-blur hover:bg-white/25">{secondary.label}</Link>
          )}
        </div>
      </div>
    </section>
  )
}
