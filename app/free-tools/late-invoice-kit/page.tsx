import type { Metadata } from 'next'
import Link from 'next/link'
import { FreeToolShell } from '@/components/free-tools/free-tool-shell'
import { LateInvoiceKit } from '@/components/free-tools/late-invoice-kit'
import { getFreeTool, freeToolPath } from '@/lib/free-tools/registry'

const tool = getFreeTool('late-invoice-kit')!

export const metadata: Metadata = {
  title: tool.title,
  description: tool.description,
  alternates: { canonical: freeToolPath(tool.slug) },
  openGraph: { title: tool.title, description: tool.description, url: freeToolPath(tool.slug), type: 'website' },
}

export default function Page() {
  return (
    <FreeToolShell tool={tool} note="Runs in your browser. Nothing you type is stored or sent anywhere.">
      <LateInvoiceKit />
      <p className="mt-10 text-sm text-zinc-400">Need wording tips? Read the <Link href="/guides/overdue-invoice-email-templates" className="font-semibold text-rose-300 hover:text-white">overdue invoice email templates guide</Link>.</p>
    </FreeToolShell>
  )
}
