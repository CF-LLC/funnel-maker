import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import { hasAccess } from '@/lib/access'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Invoices · SaaS Nation' }

const NAV = [
  { href: '/invoices', label: 'Who owes what' },
  { href: '/invoices/new', label: 'New invoice' },
  { href: '/invoices/clients', label: 'Clients' },
  { href: '/invoices/items', label: 'Saved items' },
  { href: '/invoices/settings', label: 'Settings' },
]

export default async function InvoicesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirectTo=/invoices')
  const allowed = await hasAccess(user, 'invoices')
  return (
    <div className="min-h-screen bg-app">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
          <Link href="/invoices" className="text-lg font-extrabold">Invoices</Link>
          {allowed && <nav className="flex flex-wrap gap-1 text-sm" aria-label="Invoices">
            {NAV.map((n) => <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 hover:bg-muted">{n.label}</Link>)}
          </nav>}
          <Link href="/dashboard" className="ml-auto text-sm text-muted-foreground hover:underline">← Dashboard</Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">
        {allowed ? children : (
          <div className="mx-auto max-w-lg rounded-xl border bg-background p-6 text-center">
            <h1 className="text-xl font-bold">Invoices isn&apos;t on your plan yet</h1>
            <p className="mt-2 text-sm text-muted-foreground">Invoices is $12/mo on its own or included in All Access. If you just paid, your access is turned on by hand shortly.</p>
            <Link href="/pricing" className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">See pricing</Link>
          </div>
        )}
      </main>
    </div>
  )
}
