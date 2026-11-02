import { pageMeta } from '@/lib/og/pages'
import type { Metadata } from 'next'
import { FreeToolShell } from '@/components/free-tools/free-tool-shell'
import { FreeInvoiceGenerator } from '@/components/free-tools/invoice-generator'
import { getFreeTool, freeToolPath } from '@/lib/free-tools/registry'

const tool = getFreeTool('invoice-generator')!

export const metadata: Metadata = pageMeta({ title: tool.title, description: tool.description, path: freeToolPath(tool.slug) })

export default function Page() {
  return (
    <FreeToolShell tool={tool} note="Runs in your browser. Nothing you type is stored or sent to a server.">
      <FreeInvoiceGenerator />
      <div className="mt-10"><section className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-2xl font-bold">FAQ</h2>
          <div className="divide-y divide-white/10 rounded-2xl border border-white/10">
            <details className="group p-4"><summary className="cursor-pointer font-semibold">{'Is it free?'}</summary><p className="mt-2 text-sm text-zinc-400">{'Yes, no account needed.'}</p></details>
            <details className="group p-4"><summary className="cursor-pointer font-semibold">{'Is my data saved?'}</summary><p className="mt-2 text-sm text-zinc-400">{'No, it stays in your browser.'}</p></details>
            <details className="group p-4"><summary className="cursor-pointer font-semibold">{'Can I send invoices with a pay link?'}</summary><p className="mt-2 text-sm text-zinc-400">{"That's the paid Invoices tool, $12/mo."}</p></details>
          </div>
        </section>
      </div>
    </FreeToolShell>
  )
}
