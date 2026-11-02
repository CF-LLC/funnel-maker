import { pageMeta } from '@/lib/og/pages'
import type { Metadata } from 'next'
import { FreeToolShell } from '@/components/free-tools/free-tool-shell'
import { EmailSignatureGenerator } from '@/components/free-tools/email-signature-generator'
import { getFreeTool, freeToolPath } from '@/lib/free-tools/registry'

const tool = getFreeTool('email-signature-generator')!

export const metadata: Metadata = pageMeta({ title: tool.title, description: tool.description, path: freeToolPath(tool.slug) })

export default function Page() {
  return (
    <FreeToolShell tool={tool} note="Made in your browser. Nothing you type is stored or sent anywhere, and your image is never uploaded.">
      <EmailSignatureGenerator />
    </FreeToolShell>
  )
}
