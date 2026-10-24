import type { ToolDef } from '@/tools/types'
import type { ShowcaseCard } from './types'

export function toolCard(t: ToolDef, opts: { href?: string; cta?: string; badge?: string } = {}): ShowcaseCard {
  return {
    id: t.id, art: t.id, name: t.name, tagline: t.showcase.cardTagline, colors: t.showcase.colors,
    shot: t.showcase.shot, href: opts.href ?? '/auth/register', cta: opts.cta ?? 'Start building', badge: opts.badge,
  }
}
