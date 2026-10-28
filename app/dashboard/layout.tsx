'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Zap, LogOut, Users, CreditCard, Shield, Menu, X, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { publicTools, LAUNCH_FLAGS } from '@/tools/registry'
import { TOOL_ICONS } from '@/components/tools/tool-icons'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false) // mobile drawer; desktop sidebar is always shown
  const [isAdmin, setIsAdmin] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [crmOn, setCrmOn] = useState(LAUNCH_FLAGS.crm)
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email)
      // Admin link only for admin_users (fm_is_admin); /admin itself is enforced server-side.
      if (user) (supabase as any).rpc('fm_is_admin', { uid: user.id }).then(({ data }: { data: unknown }) => setIsAdmin(data === true))
    })
    if (!LAUNCH_FLAGS.crm) (supabase as any).rpc('fm_public_flag', { flag_key: 'crm_public' }).then(({ data }: { data: unknown }) => setCrmOn(data === true))
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
    ...publicTools({ crm: crmOn }).flatMap((t) => t.nav.map((n) => ({ name: n.label, href: n.href, icon: TOOL_ICONS[n.icon] }))),
    { name: 'Organizations', href: '/dashboard/organizations', icon: Users },
    { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  ]

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
        </header>
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
