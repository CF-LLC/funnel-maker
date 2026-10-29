import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/nav/navbar'
import { Footer } from '@/components/nav/footer'
import { isUuid } from '@/lib/updates/signup'
import { UnsubscribeForm } from '@/components/updates/unsubscribe-form'

export const metadata: Metadata = { title: 'Unsubscribe from new-tool emails', robots: { index: false, follow: false } }

// Works signed out. One click confirms (a button, not the GET, so link scanners can't unsubscribe people by accident).
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token
  const valid = isUuid(token)
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <Navbar />
      <main className="container mx-auto flex-1 px-4 py-16">
        <div className="mx-auto max-w-lg rounded-3xl bg-[#121217] p-6 ring-1 ring-white/10 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[.25em] text-violet-300">SaaS Nation</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Unsubscribe from new-tool emails</h1>
          {valid ? (
            <>
              <p className="mt-2 mb-6 text-sm text-zinc-400">Stop the short emails we send when a new tool launches. This doesn&apos;t affect your account if you have one.</p>
              <UnsubscribeForm token={token!} />
            </>
          ) : (
            <p className="mt-3 text-sm text-zinc-400" data-unsub-invalid>This unsubscribe link is missing or broken. Use the full link from the email, or reply to any email from us and we&apos;ll take you off the list. <Link href="/" className="underline">Back home</Link></p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
