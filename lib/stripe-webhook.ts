// Stripe webhook logic, kept free of Next/Supabase imports so it can be unit-tested with a fake store.
import type Stripe from 'stripe'

export type MapTool = 'funnels' | 'invoices' | 'all'
export type PriceMap = Record<string, { tool: MapTool; plan?: string }>

/** STRIPE_PRICE_MAP JSON: keys are price ids (price_...) or payment link ids (plink_...). */
export function parsePriceMap(raw: string | undefined): PriceMap {
  if (!raw) return {}
  let obj: unknown
  try { obj = JSON.parse(raw) } catch { throw new Error('STRIPE_PRICE_MAP is not valid JSON') }
  const out: PriceMap = {}
  for (const [k, v] of Object.entries(obj as Record<string, any>)) {
    if (!v || !['funnels', 'invoices', 'all'].includes(v.tool)) throw new Error(`STRIPE_PRICE_MAP[${k}].tool must be funnels|invoices|all`)
    out[k] = { tool: v.tool, plan: typeof v.plan === 'string' ? v.plan.slice(0, 40) : undefined }
  }
  return out
}

export type Grant = {
  userId: string; tool: MapTool; plan: string | null; source: 'single' | 'all_access'
  customerId: string | null; subscriptionId: string | null
}

export interface Store {
  eventProcessed(id: string): Promise<boolean>
  markEvent(id: string, type: string): Promise<void>
  userExists(userId: string): Promise<boolean>
  grant(g: Grant): Promise<void>
  approveUser(userId: string): Promise<void>
  /** Sets active on every app_access row tied to the subscription; returns rows touched. */
  setSubscriptionActive(subscriptionId: string, active: boolean): Promise<number>
}

export type Deps = { store: Store; priceMap: PriceMap; listLineItemPriceIds?: (sessionId: string) => Promise<string[]> }
export type Result = { status: 'processed' | 'duplicate' | 'ignored'; detail?: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const idOf = (v: unknown): string | null => (typeof v === 'string' ? v : v && typeof v === 'object' && 'id' in v ? String((v as any).id) : null)

export function subscriptionStatusActive(status: string): boolean | null {
  if (status === 'active' || status === 'trialing' || status === 'past_due') return true
  if (status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired') return false
  return null // incomplete, paused, etc.: leave as is
}

async function onCheckout(s: Stripe.Checkout.Session, d: Deps): Promise<Result> {
  const userId = s.client_reference_id
  if (!userId || !UUID.test(userId)) return { status: 'ignored', detail: 'no client_reference_id' }
  if (!(await d.store.userExists(userId))) return { status: 'ignored', detail: 'unknown user' }
  const paid = s.payment_status === 'paid' || s.payment_status === 'no_payment_required'
  if (!paid) return { status: 'ignored', detail: `payment_status ${s.payment_status}` }

  const keys: string[] = []
  const plink = idOf(s.payment_link); if (plink) keys.push(plink)
  const embedded = (s as any).line_items?.data?.map((li: any) => idOf(li.price)).filter(Boolean) as string[] | undefined
  if (embedded?.length) keys.push(...embedded)
  else if (d.listLineItemPriceIds) keys.push(...(await d.listLineItemPriceIds(s.id)))

  const matches = new Map<MapTool, string | null>()
  for (const k of keys) { const m = d.priceMap[k]; if (m && !matches.has(m.tool)) matches.set(m.tool, m.plan ?? null) }
  if (matches.size === 0) return { status: 'ignored', detail: 'no mapped price or payment link' }

  const customerId = idOf(s.customer); const subscriptionId = idOf(s.subscription)
  for (const [tool, plan] of matches) {
    await d.store.grant({ userId, tool, plan, source: tool === 'all' ? 'all_access' : 'single', customerId, subscriptionId })
  }
  await d.store.approveUser(userId)
  return { status: 'processed', detail: [...matches.keys()].join(',') }
}

export async function handleEvent(event: Stripe.Event, d: Deps): Promise<Result> {
  if (await d.store.eventProcessed(event.id)) return { status: 'duplicate' }
  let r: Result
  switch (event.type) {
    case 'checkout.session.completed':
      r = await onCheckout(event.data.object as Stripe.Checkout.Session, d); break
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const active = subscriptionStatusActive(sub.status)
      if (active === null) { r = { status: 'ignored', detail: `status ${sub.status}` }; break }
      const n = await d.store.setSubscriptionActive(sub.id, active)
      r = { status: n ? 'processed' : 'ignored', detail: `${sub.status} rows=${n}` }; break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const n = await d.store.setSubscriptionActive(sub.id, false)
      r = { status: n ? 'processed' : 'ignored', detail: `deleted rows=${n}` }; break
    }
    default:
      r = { status: 'ignored', detail: event.type }
  }
  await d.store.markEvent(event.id, event.type)
  return r
}
