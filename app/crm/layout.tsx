import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import { hasAccess } from '@/lib/access'
import { isDemoUser } from '@/lib/demo'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Client list · SaaS Nation' }

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirectTo=/crm')
  const demo = isDemoUser(user.id)
  const allowed = demo || (await hasAccess(user, 'crm'))
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white" style={{ ['--cine-fade' as string]: '#0a0a0c' }}>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link href="/crm" className="text-lg font-extrabold">Client list</Link>
          <Link href="/dashboard" className="ml-auto text-sm text-zinc-400 hover:underline">← Dashboard</Link>
        </div>
      </header>
      {demo && <div className="border-b border-violet-400/30 bg-violet-600/20 px-4 py-2 text-center text-sm text-violet-100">Demo account: these are sample clients and nothing you change is saved.</div>}
      <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">
        {allowed ? children : (
          <div className="cine-glass mx-auto mt-10 max-w-lg rounded-2xl p-6 text-center">
            <h1 className="text-xl font-bold">Client list isn&apos;t on your plan yet</h1>
            <p className="mt-2 text-sm text-zinc-400">Client list is included in All Access. If you just paid, your access is turned on by hand shortly.</p>
            <Link href="/pricing" className="mt-4 inline-block rounded-full bg-white px-5 py-2 text-sm font-semibold text-black">See pricing</Link>
          </div>
        )}
      </main>
    </div>
  )
}
