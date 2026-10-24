import Link from 'next/link'
import { Lock } from 'lucide-react'
import { createServerClient } from '@/lib/supabase'
import { TOOL_REGISTRY, ALL_ACCESS } from '@/tools/registry'
import { TOOL_ICONS } from '@/components/tools/tool-icons'

/** Shared dashboard home section: every registered tool with the user's access / locked state. */
export async function YourTools({ userId }: { userId: string }) {
  const supabase = await createServerClient()
  const { data } = await (supabase as any).from('app_access').select('tool, active').eq('user_id', userId)
  const active = new Set<string>((data || []).filter((r: any) => r.active).map((r: any) => r.tool))
  const all = active.has(ALL_ACCESS)
  return (
    <section aria-labelledby="your-tools" className="space-y-3">
      <h2 id="your-tools" className="text-lg font-semibold">Your tools</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOL_REGISTRY.map((t) => {
          const on = all || active.has(t.accessKey)
          const Icon = TOOL_ICONS[t.nav[0]?.icon ?? 'box']
          return (
            <Link key={t.id} href={on ? t.route : '/pricing'} data-tool={t.id} data-access={on ? 'active' : 'locked'}
              className="lift flex items-start gap-3 rounded-xl border bg-background p-4 hover:border-primary">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><Icon className="h-4 w-4" /></span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-semibold">{t.name}
                  {on ? <span className="rounded-full bg-green-100 px-2 text-xs text-green-800">Active</span>
                      : <span className="flex items-center gap-1 rounded-full bg-muted px-2 text-xs text-muted-foreground"><Lock className="h-3 w-3" />Locked</span>}
                </span>
                <span className="block text-sm text-muted-foreground">{on ? t.tagline : `Unlock: ${t.priceLabel}`}</span>
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
