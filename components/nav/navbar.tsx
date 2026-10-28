'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'
import { Menu, X } from 'lucide-react'

export function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setMobileMenuOpen(false)
    window.location.href = '/'
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-zinc-950/80 backdrop-blur">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-8">
          <Link href="/" className="flex items-center gap-2 text-xl font-extrabold">
            <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white text-sm">✦</span>SaaS Nation
          </Link>
          <div className="hidden md:flex gap-6">
            <Link href="/#tools" className="text-sm hover:text-primary">
              Tools
            </Link>
            <Link href="/templates" className="text-sm hover:text-primary">
              Templates
            </Link>
            <Link href="/free-tools" className="text-sm hover:text-primary">
              Free tools
            </Link>
            <Link href="/pricing" className="text-sm hover:text-primary">
              Pricing
            </Link>
          </div>
        </div>

        {/* Desktop Actions - Always visible */}
        <div className="flex items-center gap-2 sm:gap-4">
          {user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="sm:size-default">Dashboard</Button>
              </Link>
              <Button variant="outline" size="sm" className="sm:size-default" onClick={handleSignOut}>Sign Out</Button>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" className="sm:size-default">Login</Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm" className="sm:size-default">Start building</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button - Hidden on larger screens */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t bg-background">
          <div className="container mx-auto px-4 py-4 space-y-3">
            <Link 
              href="/#tools" 
              className="block py-2 hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Tools
            </Link>
            <Link 
              href="/templates" 
              className="block py-2 hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Templates
            </Link>
            <Link 
              href="/free-tools" 
              className="block py-2 hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Free tools
            </Link>
            <Link 
              href="/pricing" 
              className="block py-2 hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            
            <div className="border-t pt-3 space-y-2">
              {user ? (
                <>
                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      Dashboard
                    </Button>
                  </Link>
                  <Button variant="outline" onClick={handleSignOut} className="w-full">
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full">
                      Login
                    </Button>
                  </Link>
                  <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full">
                      Start building
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
