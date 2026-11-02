'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'
import { Menu, X } from 'lucide-react'

/** Phone menu links (big tap targets). Mirrors every desktop nav link, plus Guides. */
export const MOBILE_MENU_LINKS = [
  { href: '/#tools', label: 'Tools' },
  { href: '/templates', label: 'Templates' },
  { href: '/free-tools', label: 'Free tools' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/guides', label: 'Guides' },
] as const

/** Marketing-site header. Used only on marketing pages, so the phone bottom bar rendered here appears only there. */
export function Navbar({ bottomBar = true }: { bottomBar?: boolean }) {
  const [user, setUser] = useState<any>(null)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const supabase = createClient()
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMounted(true)
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => { authListener?.subscription.unsubscribe() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close on route change.
  useEffect(() => { setOpen(false) }, [pathname])

  // Body scroll lock, Escape to close, focus trap while open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const panel = panelRef.current
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])') ?? [])
    focusables()[0]?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); return }
      if (e.key !== 'Tab') return
      const f = focusables(); if (!f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [open])

  // Mark the body so phones get bottom padding for the bar (see globals.css).
  useEffect(() => {
    if (!bottomBar) return
    document.body.classList.add('has-mobile-bar')
    return () => { document.body.classList.remove('has-mobile-bar') }
  }, [bottomBar])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setOpen(false)
    window.location.href = '/'
  }

  const tap = 'flex min-h-[56px] items-center rounded-xl px-4 text-2xl font-bold text-white hover:bg-white/5'

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-zinc-950/80 backdrop-blur" style={{ paddingTop: 'env(safe-area-inset-top)' }} aria-label="Main">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-8">
          <Link href="/" className="flex items-center gap-2" aria-label="SaaS Nation, software as a service: home">
            <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white text-sm">✦</span>
            <span className="flex flex-col leading-none">
              <span className="text-xl font-extrabold">SaaS Nation</span>
              <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400" data-logo-subtitle>Software as a Service</span>
            </span>
          </Link>
          <div className="hidden md:flex gap-6">
            <Link href="/#tools" className="text-sm hover:text-primary">Tools</Link>
            <Link href="/templates" className="text-sm hover:text-primary">Templates</Link>
            <Link href="/free-tools" className="text-sm hover:text-primary">Free tools</Link>
            <Link href="/pricing" className="text-sm hover:text-primary">Pricing</Link>
          </div>
        </div>

        {/* Desktop actions (unchanged) */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              <Link href="/dashboard"><Button variant="ghost" size="sm" className="sm:size-default">Dashboard</Button></Link>
              <Button variant="outline" size="sm" className="sm:size-default" onClick={handleSignOut}>Sign Out</Button>
            </>
          ) : (
            <>
              <Link href="/auth/login"><Button variant="ghost" size="sm" className="sm:size-default">Login</Button></Link>
              <Link href="/auth/register"><Button size="sm" className="sm:size-default">Start building</Button></Link>
            </>
          )}
        </div>

        {/* Phone: hamburger */}
        <button
          ref={buttonRef}
          type="button"
          className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg text-white hover:bg-white/10"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
          data-mobile-menu-button
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mounted && open && createPortal(
        <div
          id="mobile-menu"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="mobile-menu-panel fixed inset-x-0 top-0 z-[70] flex flex-col bg-zinc-950 md:hidden"
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
          data-mobile-menu
        >
          <div className="flex h-16 items-center justify-between px-4 border-b border-white/5">
            <span className="flex flex-col leading-none">
              <span className="text-xl font-extrabold">SaaS Nation</span>
              <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400">Software as a Service</span>
            </span>
            <button type="button" aria-label="Close menu" onClick={() => { setOpen(false); buttonRef.current?.focus() }} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-white hover:bg-white/10">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-4 space-y-1" data-mobile-menu-list>
            {MOBILE_MENU_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={tap} onClick={() => setOpen(false)} aria-current={pathname === l.href ? 'page' : undefined}>{l.label}</Link>
            ))}
            {user ? (
              <>
                <Link href="/dashboard" className={tap} onClick={() => setOpen(false)}>Dashboard</Link>
                <button type="button" onClick={handleSignOut} className={`${tap} w-full text-left text-zinc-300`}>Sign out</button>
              </>
            ) : (
              <Link href="/auth/login" className={tap} onClick={() => setOpen(false)}>Sign in</Link>
            )}
          </div>
          {!user && (
            <div className="shrink-0 px-4 pb-4 pt-2">
              <Link href="/auth/register" onClick={() => setOpen(false)} className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-white text-base font-bold text-black">Start building</Link>
            </div>
          )}
        </div>,
        document.body,
      )}

      {mounted && bottomBar && createPortal(
        <div
          className="mobile-bottom-bar fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-zinc-950/95 backdrop-blur md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          data-mobile-bottom-bar
        >
          <div className="flex gap-2 px-3 py-2">
            <Link href="/free-tools" className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-white/10 text-base font-semibold text-white">Free tools</Link>
            {user
              ? <Link href="/dashboard" className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-white text-base font-bold text-black">Dashboard</Link>
              : <Link href="/auth/login" className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-white text-base font-bold text-black">Sign in</Link>}
          </div>
        </div>,
        document.body,
      )}
    </nav>
  )
}
