'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Zap, LogOut, Users, CreditCard, Shield, Menu, X, Plus, Search, Settings } from 'lucide-react'
import { CommandPalette, QUICK_CREATE, openPalette } from '@/components/dashboard/command-palette'
import { createClient } from '@/lib/supabase'
import { publicTools, LAUNCH_FLAGS, LAUNCH_FLAG_KEYS } from '@/tools/registry'
import { TOOL_ICONS } from '@/components/tools/tool-icons'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false) // mobile drawer; desktop sidebar is always shown
  const [isAdmin, setIsAdmin] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [flags, setFlags] = useState<Record<string, boolean>>({ ...LAUNCH_FLAGS })
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email)
      // Admin link only for admin_users (fm_is_admin); /admin itself is enforced server-side.
      if (user) (supabase as any).rpc('fm_is_admin', { uid: user.id }).then(({ data }: { data: unknown }) => setIsAdmin(data === true))
    })
    for (const k of LAUNCH_FLAG_KEYS) if (!LAUNCH_FLAGS[k]) (supabase as any).rpc('fm_public_flag', { flag_key: `${k}_public` }).then(({ data }: { data: unknown }) => setFlags((f) => ({ ...f, [k]: data === true })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ...publicTools(flags).flatMap((t) => t.nav.map((n) => ({ name: n.label, href: n.href, icon: TOOL_ICONS[n.icon] }))),
    { name: 'Organizations', href: '/dashboard/organizations', icon: Users },
    { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]
  const paletteItems = [...QUICK_CREATE, ...navigation.map((n) => ({ label: n.name, href: n.href, group: 'Go to' as const }))]

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const isActive = (href: string) => (href === '/dashboard' ? pathname === href : pathname.startsWith(href))
  const item = (active: boolean) =>
    `press flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium ${active ? 'bg-violet-100 text-violet-800' : 'text-foreground/80 hover:bg-muted hover:text-foreground'}`

  const Sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-5">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-extrabold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white"><Zap className="h-4 w-4" /></span>
          SaaS Nation
        </Link>
        <button onClick={() => setOpen(false)} aria-label="Close menu" className="press flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted lg:hidden"><X className="h-5 w-5" /></button>
      </div>
      <div className="px-3">
        <Link href="/funnels/templates" className="press flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white shadow-md hover:brightness-110">
          <Plus className="h-4 w-4" /> New funnel
        </Link>
        <button onClick={openPalette} className="press mt-2 hidden min-h-[44px] w-full items-center gap-2 rounded-xl px-3 text-sm text-muted-foreground ring-1 ring-border hover:bg-muted lg:flex" data-search-open>
          <Search className="h-4 w-4" />Search or create<kbd className="ml-auto rounded bg-muted px-1.5 text-[10px]">Ctrl K</kbd>
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Dashboard">
        {navigation.map(({ name, href, icon: Icon }) => (
          <Link key={href} href={href} className={item(isActive(href))} aria-current={isActive(href) ? 'page' : undefined}>
            <Icon className="h-4 w-4" />{name}
          </Link>
        ))}
        {isAdmin && (
          <>
            <div className="my-2 h-px bg-border" />
            <Link href="/admin" className={`${item(false)} text-amber-700`}><Shield className="h-4 w-4" />Admin dashboard</Link>
            <Link href="/dashboard/admin" className={`${item(pathname.startsWith('/dashboard/admin'))} text-amber-700`}><Shield className="h-4 w-4" />Approvals &amp; access</Link>
          </>
        )}
      </nav>
      <div className="border-t p-3">
        {userEmail && <div className="truncate px-3 pb-2 text-xs text-muted-foreground">{userEmail}</div>}
        <button onClick={handleSignOut} className={`${item(false)} w-full`}><LogOut className="h-4 w-4" />Sign out</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-app">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-background/80 backdrop-blur lg:block">{Sidebar}</aside>

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-50 lg:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
        <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`} />
        <aside role="dialog" aria-label="Menu" className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-background shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}>{Sidebar}</aside>
      </div>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-2 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="press flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted"><Menu className="h-5 w-5" /></button>
          <Link href="/dashboard" className="flex min-h-[44px] items-center px-1 font-bold">SaaS Nation</Link>
          <button onClick={openPalette} aria-label="Search or create" className="press ml-auto flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted"><Search className="h-5 w-5" /></button>
        </header>
        <main className="mx-auto w-full max-w-7xl p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">{children}</main>
        {/* Mobile bottom nav */}
        <nav aria-label="Quick" data-bottom-nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          {[{ href: '/dashboard', label: 'Home', icon: LayoutDashboard }].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined} className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isActive(href) ? 'text-violet-600' : 'text-muted-foreground'}`}><Icon className="h-5 w-5" />{label}</Link>
          ))}
          <button onClick={openPalette} className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground"><Search className="h-5 w-5" />Search</button>
          <button onClick={openPalette} className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground"><Plus className="h-5 w-5" />Create</button>
          <button onClick={() => setOpen(true)} className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground"><Menu className="h-5 w-5" />Menu</button>
        </nav>
        <CommandPalette items={paletteItems} />
      </div>
    </div>
  )
}
