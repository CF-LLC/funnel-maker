import { createBrowserClient } from '@supabase/ssr'

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
        }
        Insert: {
          id?: string
          email: string
        }
        Update: {
          id?: string
          email?: string
        }
      }
      funnels: {
        Row: {
          id: string
          user_id: string
          name: string
          steps: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          steps?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          steps?: Record<string, unknown>
          created_at?: string
        }
      }
      analytics: {
        Row: {
          id: string
          funnel_id: string
          data: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          funnel_id: string
          data?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          funnel_id?: string
          data?: Record<string, unknown>
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          plan_type: string
          status: string
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan_type: string
          status: string
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan_type?: string
          status?: string
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Client-side Supabase client (for use in Client Components)
export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
  
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseKey
  )
}

// Server-side Supabase client (for use in Server Components)
export const createServerClient = async () => {
  const { createServerClient: createSupabaseServerClient } = await import('@supabase/ssr')
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
  
  return createSupabaseServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component - ignore
          }
        },
      },
    }
  )
}
