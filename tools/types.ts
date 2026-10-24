// Data-only tool definition (safe to import from middleware/edge, server and client code).
export type ToolIcon = 'zap' | 'layout-template' | 'receipt' | 'link' | 'box' | 'clipboard' | 'file-check' | 'star'
export type ToolNavItem = { label: string; href: string; icon: ToolIcon }
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
}
