import { createServerClient } from '@/lib/supabase'
import { PlanType } from './stripe'

export type Subscription = {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan_type: PlanType
  status: string
  current_period_end: string | null
  created_at: string
  updated_at?: string
}

export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('subscriptions')
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
      plan_type: 'free',
      status: 'active',
      current_period_end: null,
      created_at: new Date().toISOString(),
    }
  }

  return data
}

export async function canCreateFunnel(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId)
  
  if (!subscription || subscription.plan_type === 'free') {
    const supabase = await createServerClient()
    const { data: funnels } = await supabase
      .from('funnels')
      .select('id')
      .eq('user_id', userId)
    
    return !funnels || funnels.length < 1
  }
  
  return true // Pro and Enterprise have unlimited funnels
}

export async function hasAnalyticsAccess(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId)
  return subscription?.plan_type !== 'free'
}

export async function updateSubscription(
  userId: string,
  data: Partial<Subscription>
): Promise<void> {
  const supabase = await createServerClient()
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
