import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { isUserFlagEnabled } from '@/lib/flags'
import { isDemoUser } from '@/lib/demo'

// Grouped sidebar (workspace_v2). Read-only: the flag and the user's own active app_access tools (RLS: own rows).
export async function GET() {
  const headers = { 'cache-control': 'no-store' }
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || isDemoUser(user.id) || !(await isUserFlagEnabled('workspace_v2', user.id))) return NextResponse.json({ v2: false }, { headers })
    const { data } = await (supabase as any).from('app_access').select('tool').eq('user_id', user.id).eq('active', true).limit(100)
    const access: string[] = Array.isArray(data) ? data.map((r: any) => String(r.tool)) : []
    return NextResponse.json({ v2: true, access }, { headers })
  } catch {
    return NextResponse.json({ v2: false }, { headers })
  }
}
