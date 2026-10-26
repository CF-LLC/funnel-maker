import { PUBLIC_TOOLS as TOOL_REGISTRY } from '@/tools/registry'
import type { ToolDef } from '@/tools/types'
import { TOOL_ICONS } from '@/components/tools/tool-icons'

function Card({ t }: { t: ToolDef }) {
  const Icon = TOOL_ICONS[t.nav[0]?.icon ?? 'box']
  return (
    <div data-tool={t.id} className="rounded-xl border p-4">
      <div className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-primary" />{t.name}</div>
      <p className="text-sm text-muted-foreground">{t.tagline}</p>
      <p className="mt-1 text-xs font-medium">{t.priceLabel}</p>
    </div>
  )
}

/** Pricing page: tools listed from the single registry. Tools in the 'everyone' row get their own "For everyone" row. */
export function ToolsList() {
  const all = TOOL_REGISTRY as readonly ToolDef[]
  const included = all.filter((t) => t.includedWithAnyPlan)
  const sold = all.filter((t) => !t.includedWithAnyPlan)
  const everyone = sold.filter((t) => t.showcase.rows.includes('everyone'))
  const business = sold.filter((t) => !t.showcase.rows.includes('everyone'))
  return (
    <div className="max-w-5xl mx-auto mb-12 space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{business.map((t) => <Card key={t.id} t={t} />)}</div>
      {everyone.length > 0 && (
        <div data-row="everyone">
          <h3 className="mb-3 text-lg font-bold">For everyone</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{everyone.map((t) => <Card key={t.id} t={t} />)}</div>
        </div>
      )}
      <div className="rounded-xl border border-primary p-4 text-center text-sm">
        <strong>All Access</strong> covers every tool above, including new ones as they launch.
        {included.length > 0 && <span className="block mt-1 text-muted-foreground">Included with every paid plan: {included.map((t) => t.name).join(', ')}.</span>}
      </div>
    </div>
  )
}
