import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import { isAdmin } from '@/lib/admin'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Zap, BarChart3, LogOut, Users, CreditCard, Shield } from 'lucide-react'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const adminAccess = await isAdmin(user.id)

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/50 relative flex flex-col">
        <div className="p-6">
          <Link href="/" className="text-2xl font-bold">
            Funnel Maker
          </Link>
        </div>
        <nav className="space-y-1 px-3 flex-1">
          <Link href="/dashboard">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
          <Link href="/dashboard/funnels">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Zap className="w-4 h-4" />
              Funnels
            </Button>
          </Link>
          <Link href="/dashboard/organizations">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Users className="w-4 h-4" />
              Organizations
            </Button>
          </Link>
          <Link href="/dashboard/templates">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <BarChart3 className="w-4 h-4" />
              Templates
            </Button>
          </Link>
          <Link href="/dashboard/billing">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <CreditCard className="w-4 h-4" />
              Billing
            </Button>
          </Link>
          {adminAccess && (
            <>
              <div className="h-px bg-border my-2" />
              <Link href="/dashboard/admin">
                <Button variant="ghost" className="w-full justify-start gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                  <Shield className="w-4 h-4" />
                  Admin
                </Button>
              </Link>
            </>
          )}
        </nav>
        <div className="p-3 border-t">
          <form action="/auth/signout" method="post">
            <Button variant="ghost" className="w-full justify-start gap-2" type="submit">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
