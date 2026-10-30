// Data-only tool definition (safe to import from middleware/edge, server and client code).
export type ToolIcon = 'zap' | 'layout-template' | 'receipt' | 'link' | 'box' | 'clipboard' | 'file-check' | 'star' | 'calendar' | 'shield' | 'users' | 'mail' | 'download' | 'portal' | 'approvals' | 'changelog' | 'time' | 'expenses' | 'reports' | 'paid'
/** Pre-launch flags; each has a runtime `<flag>_public` row in feature_flags and a NEXT_PUBLIC_<FLAG>_ENABLED build override. */
export type LaunchFlag = 'crm' | 'emaillist' | 'downloads' | 'portal' | 'approvals' | 'changelog' | 'timetracking' | 'expenses' | 'reports' | 'paid'
export type ToolNavItem = { label: string; href: string; icon: ToolIcon }
/** Home/dashboard rows a tool appears in (besides "All tools"). */
export type ToolRow = 'coaches' | 'creators' | 'get-paid' | 'everyone'
/** Netflix-style poster + card metadata. Colors are plain hex; art is CSS/SVG in components/tools/poster.tsx. */
export type ToolShowcase = {
  /** One-line card tagline. */
  cardTagline: string
  rows: readonly ToolRow[]
  /** Poster gradient (from, to) and the tool's own accent color. */
  colors: { from: string; to: string; accent: string }
  /** Static screenshot in /public used in hover previews. */
  shot: string
  /** Display order in "All tools" (lower first). */
  order: number
}
export type ToolDef = {
  /** Stable id. Also the app_access.tool value and the STRIPE_PRICE_MAP tool value. */
  id: string
  name: string
  tagline: string
  /** Tool home (where the dashboard card links). */
  route: string
  /** Entries for the shared dashboard sidebar. */
  nav: ToolNavItem[]
  /** app_access key checked by hasAccess(); usually === id. */
  accessKey: string
  /** Path prefixes that require sign-in (enforced by middleware). */
  protectedPaths: string[]
  /** Short price line for the pricing page tool list. */
  priceLabel: string
  /** Included with every paid plan: any active app_access row grants it; not sold separately. */
  includedWithAnyPlan?: boolean
  /** Pre-launch: hidden from every public surface unless its flag is on (see isToolLaunched). */
  launchFlag?: LaunchFlag
  showcase: ToolShowcase
}
