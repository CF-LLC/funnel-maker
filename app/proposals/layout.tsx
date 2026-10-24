import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import { hasAccess } from '@/lib/access'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Proposals · SaaS Nation' }

export default async function ProposalsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirectTo=/proposals')
  const allowed = await hasAccess(user, 'proposals')
  return (
    <div className="min-h-screen bg-app">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link href="/proposals" className="text-lg font-extrabold">Proposals</Link>
          {allowed && <Link href="/proposals/new" className="text-sm hover:underline">New proposal</Link>}
          <Link href="/dashboard" className="ml-auto text-sm text-muted-foreground hover:underline">← Dashboard</Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        {allowed ? children : (
          <div className="mx-auto max-w-lg rounded-xl border bg-background p-6 text-center">
            <h1 className="text-xl font-bold">Proposals isn&apos;t on your plan yet</h1>
            <p className="mt-2 text-sm text-muted-foreground">Proposals is $12/mo on its own or included in All Access. If you just paid, your access is turned on by hand shortly.</p>
            <Link href="/pricing" className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">See pricing</Link>
          </div>
        )}
      </main>
    </div>
  )
}
