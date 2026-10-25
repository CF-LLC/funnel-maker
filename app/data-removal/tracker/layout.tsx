import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import { hasAccess } from '@/lib/access'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Data Removal · SaaS Nation' }

export default async function DataRemovalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirectTo=/data-removal/tracker')
  const allowed = await hasAccess(user, 'dataremoval')
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white" style={{ ['--cine-fade' as string]: '#0a0a0c' }}>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link href="/data-removal/tracker" className="text-lg font-extrabold">Data Removal</Link>
          <Link href="/dashboard" className="ml-auto text-sm text-zinc-400 hover:underline">← Dashboard</Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        {allowed ? children : (
          <div className="cine-glass mx-auto mt-10 max-w-lg rounded-2xl p-6 text-center">
            <h1 className="text-xl font-bold">Data Removal isn&apos;t on your plan yet</h1>
            <p className="mt-2 text-sm text-zinc-400">Data Removal is $12/mo or $99/yr on its own or included in All Access. If you just paid, your access is turned on by hand shortly.</p>
            <Link href="/pricing" className="mt-4 inline-block rounded-full bg-white px-5 py-2 text-sm font-semibold text-black">See pricing</Link>
          </div>
        )}
      </main>
    </div>
  )
}
