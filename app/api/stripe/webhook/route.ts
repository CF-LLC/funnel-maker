import { NextResponse } from 'next/server'
import { logError } from '@/lib/server/log-error'
import Stripe from 'stripe'
import { handleEvent, parsePriceMap } from '@/lib/stripe-webhook'
import { supabaseStore } from '@/lib/server/stripe-store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST /api/stripe/webhook: verifies the Stripe signature on the raw body, then updates app_access.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  const sig = request.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  const raw = await request.text()
  // Signature verification needs no API key; a placeholder keeps the SDK happy when STRIPE_SECRET_KEY is unset.
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_unset', { apiVersion: '2025-10-29.clover' })
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }
  let priceMap
  try { priceMap = parsePriceMap(process.env.STRIPE_PRICE_MAP) } catch (e: any) {
    console.error('[stripe-webhook]', e.message)
    await logError('/api/stripe/webhook', e, { detail: { stage: 'price_map' } })
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  try {
    const result = await handleEvent(event, {
      store: supabaseStore(),
      priceMap,
      listLineItemPriceIds: process.env.STRIPE_SECRET_KEY
        ? async (id) => (await stripe.checkout.sessions.listLineItems(id, { limit: 20 })).data.map((li) => li.price?.id).filter((x): x is string => !!x)
        : undefined,
    })
    return NextResponse.json({ received: true, ...result })
  } catch (e: any) {
    console.error('[stripe-webhook] failed', event.type, event.id, e?.message)
    await logError('/api/stripe/webhook', e, { detail: { type: event.type, id: event.id } })
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 }) // Stripe retries
  }
}
