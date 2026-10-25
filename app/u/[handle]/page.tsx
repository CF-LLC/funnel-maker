import Link from 'next/link'
import { DemoBanner } from '@/components/demo-banner'
import { isDemoUser } from '@/lib/demo'

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowUpRight, CalendarDays, Facebook, Github, Instagram, Linkedin, Music2, Twitter, Youtube, type LucideIcon } from 'lucide-react'
import { getPublicPage } from '@/lib/linkinbio/public'
import { getEmbed } from '@/lib/testimonials/public'
import { ReviewList } from '@/components/testimonials/review-list'
import { clickHref, type Social, type Theme } from '@/lib/linkinbio/core'
import { Backdrop, Monogram } from '@/components/booking/backdrop'
import { getBookingOwner } from '@/lib/booking/public'
import { bookPath } from '@/lib/booking/core'

export const dynamic = 'force-dynamic'

const ICONS: Record<Social, LucideIcon> = { instagram: Instagram, x: Twitter, youtube: Youtube, tiktok: Music2, linkedin: Linkedin, github: Github, facebook: Facebook }
const THEME: Record<Theme, { page: string; btn: string; muted: string; fade: string; hue: 'violet' | 'rose' | 'mono'; chip: string }> = {
  light: { page: 'bg-white text-neutral-900', btn: 'bg-white border-neutral-200 shadow-sm hover:border-violet-400', muted: 'text-neutral-600', fade: '#ffffff', hue: 'violet', chip: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200' },
  dark: { page: 'bg-[#0a0a0c] text-white', btn: 'cine-glass', muted: 'text-zinc-400', fade: '#0a0a0c', hue: 'violet', chip: 'bg-white/10 text-white hover:bg-white/20' },
  brand: { page: 'bg-[#14061f] text-white', btn: 'bg-white/10 border-white/20 backdrop-blur hover:bg-white/15', muted: 'text-white/75', fade: '#14061f', hue: 'rose', chip: 'bg-white/15 text-white hover:bg-white/25' },
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const page = await getPublicPage((await params).handle)
  return page ? { title: page.display_name || `@${page.handle}`, description: page.bio || undefined } : { title: 'This page is unavailable.', robots: { index: false } }
}

export default async function LinkInBioPage({ params }: { params: Promise<{ handle: string }> }) {
  const page = await getPublicPage((await params).handle)
  if (!page) notFound()
  const t = THEME[page.theme]
  const reviews = await getEmbed(page.user_id, page.handle, 'linkinbio_layout')
  const socials = Object.entries(page.socials) as [Social, string][]
  const booking = await getBookingOwner(page.handle).catch(() => null)
  const name = page.display_name || `@${page.handle}`
  const card = `cine-card group flex items-center gap-3 rounded-2xl border px-5 py-4 text-left font-semibold ${t.btn}`
  return (
    <>{isDemoUser(page.user_id) && <DemoBanner />}
    <div className={`min-h-screen ${t.page}`} data-theme={page.theme} style={{ ['--cine-fade' as string]: t.fade }}>
      <header className="cine-hero h-56 sm:h-72"><Backdrop hue={t.hue} /></header>
      <main className="relative mx-auto -mt-24 w-full max-w-xl px-5 pb-12 sm:-mt-32">
        <div className="cine-rise flex flex-col items-center text-center">
          {page.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={page.avatar_url} alt="" className="h-28 w-28 rounded-3xl object-cover ring-4 ring-white/20 shadow-[0_24px_60px_-20px_rgba(0,0,0,.9)]" referrerPolicy="no-referrer" />
          ) : <Monogram name={name} />}
          <h1 className="cine-title mt-5 !text-4xl sm:!text-5xl">{name}</h1>
          {page.display_name && <p className={`mt-1 text-sm font-semibold ${t.muted}`}>@{page.handle}</p>}
          {page.bio && <p className={`mt-4 max-w-md whitespace-pre-line text-base ${t.muted}`}>{page.bio}</p>}
          {socials.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {socials.map(([k, url]) => { const I = ICONS[k]; return <a key={k} href={url} rel="noopener nofollow me" aria-label={k} className={`press grid h-11 w-11 place-items-center rounded-full ${t.chip}`}><I className="h-5 w-5" /></a> })}
            </div>
          )}
        </div>
        <ul className="mt-8 space-y-3">
          {booking && booking.types.length > 0 && (
            <li className="cine-rise cine-rise-1">
              <Link href={bookPath(page.handle)} className="cine-card group flex items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-600 px-5 py-5 text-white shadow-[0_20px_50px_-20px_rgba(192,38,211,.9)]">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20"><CalendarDays className="h-6 w-6" /></span>
                <span className="flex-1"><span className="block text-lg font-extrabold">Book a call</span><span className="block text-sm text-white/85">Pick a time that works for you</span></span>
                <ArrowUpRight className="cine-arrow h-5 w-5" />
              </Link>
            </li>
          )}
          {page.links.map((l) => <li key={l.id} className="cine-rise cine-rise-2"><a href={clickHref(page.handle, l.id)} rel="noopener nofollow" className={card}><span className="flex-1">{l.title}</span><ArrowUpRight className="cine-arrow h-4 w-4 opacity-60" /></a></li>)}
          {page.funnels.map((f) => <li key={f.slug} className="cine-rise cine-rise-2"><Link href={`/f/${f.slug}`} className={card}><span className="flex-1">{f.name}</span><ArrowUpRight className="cine-arrow h-4 w-4 opacity-60" /></Link></li>)}
        </ul>
        {reviews && <div className="mt-10"><ReviewList reviews={reviews.reviews} layout={reviews.layout} handle={reviews.handle} /></div>}
      </main>
      {page.badge && (
        <footer className={`pb-10 text-center text-xs ${t.muted}`} data-badge>
          <Link href="/pricing" className="hover:underline">Made with SaaS Nation</Link>
        </footer>
      )}
    </div>
    </>
  )
}
