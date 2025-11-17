import { createServerClient } from '@/lib/supabase'
import { PlanType } from './stripe'

export type Subscription = {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: PlanType
  status: string
  current_period_end: string | null
  created_at: string
}

export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  const supabase = await createServerClient()
  
  const { data, error } = await (supabase
    .from('subscriptions') as any)
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    // Return default free plan if no subscription exists
    return {
      id: '',
      user_id: userId,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      plan: 'free',
      status: 'active',
      current_period_end: null,
      created_at: new Date().toISOString(),
    }
  }

  return data
}

export async function canCreateFunnel(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId)
  
  if (!subscription || subscription.plan === 'free') {
    const supabase = await createServerClient()
    const { data: funnels } = await (supabase
      .from('funnels') as any)
      .select('id')
      .eq('user_id', userId)
    
    return !funnels || funnels.length < 1
  }
  
  return true // Pro and Enterprise have unlimited funnels
}

export async function hasAnalyticsAccess(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId)
  return subscription?.plan !== 'free'
}

export async function updateSubscription(
  userId: string,
  data: Partial<Subscription>
): Promise<void> {
  const supabase = await createServerClient()
  
  const { error } = await (supabase
    .from('subscriptions') as any)
    .upsert({
      user_id: userId,
      ...data,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    throw new Error(`Failed to update subscription: ${error.message}`)
  }
}
