import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import { hasAccess } from '@/lib/access'
import { isDemoUser } from '@/lib/demo'
import { ElTabs } from '@/components/emaillist/tabs'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Email list · SaaS Nation' }

export default async function EmailListLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirectTo=/email-list')
  const demo = isDemoUser(user.id)
  const allowed = demo || (await hasAccess(user, 'emaillist'))
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white" style={{ ['--cine-fade' as string]: '#0a0a0c' }}>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link href="/email-list" className="text-lg font-extrabold">Email list</Link>
          <Link href="/dashboard" className="ml-auto text-sm text-zinc-400 hover:underline">← Dashboard</Link>
        </div>
        {allowed && <ElTabs />}
      </header>
      {demo && <div className="border-b border-cyan-400/30 bg-cyan-600/15 px-4 py-2 text-center text-sm text-cyan-100">Demo account: sample subscribers. Nothing is saved and no email is ever sent.</div>}
      <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">
        {allowed ? children : (
          <div className="cine-glass mx-auto mt-10 max-w-lg rounded-2xl p-6 text-center">
            <h1 className="text-xl font-bold">Email list isn&apos;t on your plan yet</h1>
            <p className="mt-2 text-sm text-zinc-400">Email list is $12/mo or $99/yr, and it&apos;s included in All Access. If you just paid, your access is turned on by hand shortly.</p>
            <Link href="/pricing" className="mt-4 inline-block rounded-full bg-white px-5 py-2 text-sm font-semibold text-black">See pricing</Link>
          </div>
        )}
      </main>
    </div>
  )
}
