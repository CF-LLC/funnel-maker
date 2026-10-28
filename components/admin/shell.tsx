import Link from 'next/link'
import { AdminNav } from './nav'

export function AdminShell({ children, current }: { children: React.ReactNode; current?: string }) {
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white" style={{ ['--cine-fade' as string]: '#0a0a0c' }}>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/admin" className="text-lg font-extrabold">SaaS Nation <span className="text-amber-300">Admin</span></Link>
          <Link href="/dashboard" className="ml-auto text-sm text-zinc-400 hover:underline">← Dashboard</Link>
        </div>
        <AdminNav current={current} />
      </header>
      <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">{children}</main>
    </div>
  )
}
