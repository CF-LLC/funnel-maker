import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPublicForm } from '@/lib/forms/public'
import { PublicFormView } from '@/components/forms/public-form'

export const dynamic = 'force-dynamic'
type P = { params: Promise<{ handle: string; slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { handle, slug } = await params
  const f = await getPublicForm(handle, slug)
  return f ? { title: f.title, description: f.description || undefined } : { title: 'This page is unavailable.', robots: { index: false } }
}

export default async function PublicFormPage({ params, searchParams }: P) {
  const { handle, slug } = await params
  const embed = (await searchParams).embed === '1'
  const f = await getPublicForm(handle, slug)
  if (!f) notFound()
  return (
    <div className={embed ? 'p-2' : 'min-h-screen bg-app flex flex-col items-center px-4 py-12'}>
      <main className="mx-auto w-full max-w-lg space-y-4">
        {!embed && <h1 className="text-2xl font-bold">{f.title}</h1>}
        {f.description && <p className="text-muted-foreground whitespace-pre-line">{f.description}</p>}
        <PublicFormView handle={f.handle} slug={f.slug} fields={f.fields} submitLabel={f.submit_label} />
      </main>
      {!embed && <footer className="mt-12 text-xs text-muted-foreground"><Link href="/pricing" className="hover:underline">Made with SaaS Nation</Link></footer>}
    </div>
  )
}
