import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { serviceClient } from '@/lib/server/admin-client'
import { ensureProfile } from '@/lib/server/ensure-profile'

export const dynamic = 'force-dynamic'

/** Login/session fallback: creates the signed-in user's missing profile row. Idempotent. */
export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'not signed in' }, { status: 401 })
  try {
    const r = await ensureProfile(serviceClient(), user)
    if (r.error) {
      console.error('ensure-profile failed', r.error)
      return NextResponse.json({ ok: false }, { status: 500 })
    }
    return NextResponse.json({ ok: true, created: r.created })
  } catch (e) {
    console.error('ensure-profile error', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
