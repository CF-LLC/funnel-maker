'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Zap, BarChart3, LogOut, Users, CreditCard, Shield, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
        setIsAdmin(user.email === 'cooperfeatherstone13@gmail.com')
      }
    }
    checkAdmin()
  }, [])

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Funnels', href: '/dashboard/funnels', icon: Zap },
    { name: 'Organizations', href: '/dashboard/organizations', icon: Users },
    { name: 'Templates', href: '/dashboard/templates', icon: BarChart3 },
    { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  ]

  return (
    <div className="min-h-screen flex">
      {/* Sidebar - always rendered */}
      <aside 
        className={`
          fixed top-0 left-0 z-50 h-screen
          w-64 border-r bg-background
          transition-transform duration-300 ease-in-out
          flex flex-col shadow-lg
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6 border-b flex items-center justify-between">
          <Link href="/dashboard" className="text-2xl font-bold">
            Funnel Maker
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <nav className="space-y-1 px-3 flex-1 py-4">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => setSidebarOpen(false)}
              >
                <Button 
                  variant={isActive ? "secondary" : "ghost"} 
                  className="w-full justify-start gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Button>
              </Link>
            )
          })}
          {isAdmin && (
            <>
              <div className="h-px bg-border my-2" />
              <Link 
                href="/dashboard/admin"
                onClick={() => setSidebarOpen(false)}
              >
                <Button 
                  variant={pathname === '/dashboard/admin' ? "secondary" : "ghost"} 
                  className="w-full justify-start gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </Button>
              </Link>
            </>
          )}
          
          <form action="/auth/signout" method="post">
            <Button variant="ghost" className="w-full justify-start gap-2" type="submit">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </form>
        </nav>

        <div className="p-3 border-t">
          {userEmail && (
            <div className="px-3 py-2 text-xs text-muted-foreground truncate">
              {userEmail}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className="flex-1 overflow-auto transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? '256px' : '0' }}
      >
        {/* Menu Button - Always Visible */}
        <div className="sticky top-0 z-30 bg-background border-b px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <span className="font-semibold">Funnel Maker</span>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
