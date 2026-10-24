import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Facebook, Github, Instagram, Linkedin, Music2, Twitter, Youtube, type LucideIcon } from 'lucide-react'
import { getPublicPage } from '@/lib/linkinbio/public'
import { clickHref, type Social, type Theme } from '@/lib/linkinbio/core'

export const dynamic = 'force-dynamic'

const ICONS: Record<Social, LucideIcon> = { instagram: Instagram, x: Twitter, youtube: Youtube, tiktok: Music2, linkedin: Linkedin, github: Github, facebook: Facebook }
const THEME: Record<Theme, { page: string; btn: string; muted: string }> = {
  light: { page: 'bg-white text-neutral-900', btn: 'bg-white border-neutral-300 hover:border-neutral-900', muted: 'text-neutral-500' },
  dark: { page: 'bg-neutral-950 text-white', btn: 'bg-neutral-900 border-neutral-700 hover:border-white', muted: 'text-neutral-400' },
  brand: { page: 'bg-brand text-white', btn: 'bg-white/15 border-white/30 hover:bg-white/25', muted: 'text-white/80' },
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const page = await getPublicPage((await params).handle)
  return page ? { title: page.display_name || `@${page.handle}`, description: page.bio || undefined } : { title: 'This page is unavailable.', robots: { index: false } }
}

export default async function LinkInBioPage({ params }: { params: Promise<{ handle: string }> }) {
  const page = await getPublicPage((await params).handle)
  if (!page) notFound()
  const t = THEME[page.theme]
  const socials = Object.entries(page.socials) as [Social, string][]
  const btn = `press block rounded-xl border px-4 py-3 font-semibold transition ${t.btn}`
  return (
    <div className={`min-h-screen flex flex-col items-center px-4 py-12 ${t.page}`} data-theme={page.theme}>
      <main className="w-full max-w-md flex-1 space-y-6 text-center">
        {page.avatar_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={page.avatar_url} alt="" className="mx-auto h-24 w-24 rounded-full object-cover border" referrerPolicy="no-referrer" />
        )}
        <div>
          <h1 className="text-2xl font-bold">{page.display_name || `@${page.handle}`}</h1>
          {page.bio && <p className={`mt-2 whitespace-pre-line ${t.muted}`}>{page.bio}</p>}
        </div>
        {socials.length > 0 && (
          <div className="flex justify-center gap-4">
            {socials.map(([k, url]) => { const I = ICONS[k]; return <a key={k} href={url} rel="noopener nofollow me" aria-label={k} className="opacity-80 hover:opacity-100"><I className="h-6 w-6" /></a> })}
          </div>
        )}
        <ul className="space-y-3">
          {page.links.map((l) => <li key={l.id}><a href={clickHref(page.handle, l.id)} rel="noopener nofollow" className={btn}>{l.title}</a></li>)}
          {page.funnels.map((f) => <li key={f.slug}><Link href={`/f/${f.slug}`} className={btn}>{f.name}</Link></li>)}
        </ul>
      </main>
      {page.badge && (
        <footer className={`mt-12 text-xs ${t.muted}`} data-badge>
          <Link href="/pricing" className="hover:underline">Made with SaaS Nation</Link>
        </footer>
      )}
    </div>
  )
}
