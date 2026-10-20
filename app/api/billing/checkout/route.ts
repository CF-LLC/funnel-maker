import { NextResponse } from 'next/server'

// Billing runs on Stripe Payment Links (lib/plans.ts) with manual activation in /dashboard/admin/approvals.
// This legacy Stripe API route is disabled so it can never create Stripe objects or write billing state.
export const dynamic = 'force-dynamic'

function gone() {
  return NextResponse.json({ error: 'Billing is handled by Stripe Payment Links. See /pricing.' }, { status: 410 })
}

export const GET = gone
export const POST = gone
