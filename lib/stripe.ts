import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-10-29.clover',
  typescript: true,
})

export const STRIPE_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,
    features: [
      '1 funnel',
      'Basic templates',
      'Community support',
      'Basic analytics',
    ],
    limits: {
      funnels: 1,
      analytics: false,
      team: false,
    },
  },
  pro: {
    name: 'Pro',
    price: 1900, // $19.00 in cents
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro',
    features: [
      'Unlimited funnels',
      'All templates',
      'Full analytics',
      'Priority support',
      'Custom domains',
      'A/B testing',
    ],
    limits: {
      funnels: -1, // unlimited
      analytics: true,
      team: false,
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: 7900, // $79.00 in cents
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise',
    features: [
      'Everything in Pro',
      'Team accounts',
      'White label',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
    ],
    limits: {
      funnels: -1, // unlimited
      analytics: true,
      team: true,
    },
  },
} as const

export type PlanType = keyof typeof STRIPE_PLANS

export function getPlanDetails(plan: PlanType) {
  return STRIPE_PLANS[plan]
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}
