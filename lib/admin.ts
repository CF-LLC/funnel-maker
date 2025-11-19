import { createServerClient } from './supabase'

export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createServerClient()
  
  const { data } = await (supabase
    .from('admin_users') as any)
    .select('id')
    .eq('id', userId)
    .single()
  
  return !!data
}

export async function requireAdmin(userId: string): Promise<void> {
  const admin = await isAdmin(userId)
  if (!admin) {
    throw new Error('Unauthorized: Admin access required')
  }
}

export async function getAllUsers() {
  const supabase = await createServerClient()
  
  const { data: users } = await (supabase
    .from('users') as any)
    .select(`
      *,
      funnels:funnels(count),
      subscription:subscriptions(*)
    `)
    .order('email', { ascending: true })
  
  return users || []
}

export async function getAllFunnels() {
  const supabase = await createServerClient()
  
  const { data: funnels } = await (supabase
    .from('funnels') as any)
    .select(`
      *,
      user:users(email)
    `)
    .order('created_at', { ascending: false })
  
  return funnels || []
}
