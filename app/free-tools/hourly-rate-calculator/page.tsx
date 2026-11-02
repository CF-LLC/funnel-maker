import { pageMeta } from '@/lib/og/pages'
import type { Metadata } from 'next'
import { FreeToolShell } from '@/components/free-tools/free-tool-shell'
import { HourlyRateCalculator } from '@/components/free-tools/hourly-rate-calculator'
import { getFreeTool, freeToolPath } from '@/lib/free-tools/registry'

const tool = getFreeTool('hourly-rate-calculator')!

export const metadata: Metadata = pageMeta({ title: tool.title, description: tool.description, path: freeToolPath(tool.slug) })

export default function Page() {
  return (
    <FreeToolShell tool={tool} note="Instant result in your browser. Nothing you type is stored or sent anywhere.">
      <HourlyRateCalculator />
    </FreeToolShell>
  )
}
