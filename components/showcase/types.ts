export type ShowcaseCard = {
  id: string
  /** Poster motif id (tool id). */
  art: string
  name: string
  tagline: string
  colors: { from: string; to: string; accent: string }
  shot?: string
  href: string
  cta: string
  badge?: string
}
