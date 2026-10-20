import Link from 'next/link'
import { notFound } from 'next/navigation'
import { templates } from '@/data/templates'
import { FunnelRenderer } from '@/components/funnel/funnel-renderer'

export function generateStaticParams() {
  return templates.map((t) => ({ id: t.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const t = templates.find((x) => x.id === id)
  return { title: t ? `${t.name} template preview · Funnel Maker` : 'Template preview', robots: { index: false } }
}

/** Public, read-only preview of a template with every page stacked. Forms are disabled here. */
export default async function TemplatePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const t = templates.find((x) => x.id === id)
  if (!t) notFound()
  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-gray-950/90 px-4 py-2.5 text-sm text-white backdrop-blur">
        <span className="truncate"><b>{t.name}</b> <span className="text-white/70">· preview</span></span>
        <Link href={`/dashboard/templates?start=${t.id}`} className="press inline-flex min-h-[40px] shrink-0 items-center rounded-full bg-brand px-4 font-semibold">Use this template</Link>
      </div>
      <FunnelRenderer funnel={{ id: t.id, name: t.name, slug: null, template: t.id, steps: t.steps }} mode="all" preview />
    </div>
  )
}
