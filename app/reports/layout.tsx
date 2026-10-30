import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import { hasAccess } from '@/lib/access'
import { isDemoUser } from '@/lib/demo'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Report kit · SaaS Nation' }

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirectTo=/reports')
  const demo = isDemoUser(user.id)
  const allowed = demo || (await hasAccess(user, 'reports'))
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white" style={{ ['--cine-fade' as string]: '#0a0a0c' }}>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link href="/reports" className="text-lg font-extrabold">Report kit</Link>
          <Link href="/dashboard" className="ml-auto text-sm text-zinc-400 hover:underline">← Dashboard</Link>
        </div>
      </header>
      {demo && <div className="border-b border-purple-400/30 bg-purple-600/15 px-4 py-2 text-center text-sm text-purple-100">Demo account: sample reports. Nothing you do here is saved.</div>}
      <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">
        {allowed ? children : (
          <div className="cine-glass mx-auto mt-10 max-w-lg rounded-2xl p-6 text-center">
            <h1 className="text-xl font-bold">Report kit isn&apos;t on your plan yet</h1>
            <p className="mt-2 text-sm text-zinc-400">Report kit is $12/mo or $99/yr, and it&apos;s included in All Access. If you just paid, your access is turned on by hand shortly.</p>
            <Link href="/pricing" className="mt-4 inline-block rounded-full bg-white px-5 py-2 text-sm font-semibold text-black">See pricing</Link>
          </div>
        )}
      </main>
    </div>
  )
}
