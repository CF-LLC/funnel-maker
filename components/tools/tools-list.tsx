import { TOOL_REGISTRY } from '@/tools/registry'
import { TOOL_ICONS } from '@/components/tools/tool-icons'

/** Pricing page: tools listed from the single registry. */
export function ToolsList() {
  return (
    <div className="max-w-5xl mx-auto mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {TOOL_REGISTRY.map((t) => {
        const Icon = TOOL_ICONS[t.nav[0]?.icon ?? 'box']
        return (
          <div key={t.id} data-tool={t.id} className="rounded-xl border p-4">
            <div className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-primary" />{t.name}</div>
            <p className="text-sm text-muted-foreground">{t.tagline}</p>
            <p className="mt-1 text-xs font-medium">{t.priceLabel}</p>
          </div>
        )
      })}
      <div className="rounded-xl border border-primary p-4 sm:col-span-2 lg:col-span-3 text-center text-sm">
        <strong>All Access</strong> covers every tool above, including new ones as they launch.
      </div>
    </div>
  )
}
