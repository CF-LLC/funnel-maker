import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Lapsed subscribers (had funnels/all access, none active) can't create funnels; pending signups can draft.
  const { data: lapsed } = await (supabase as any).rpc('fm_funnels_lapsed', { uid: user.id })
  if (lapsed === true) {
    return NextResponse.json({ error: 'funnels_access_required' }, { status: 403 })
  }

  const body = await request.json()
  const { name, steps } = body

  const { data, error } = await supabase
    .from('funnels')
    .insert([{ user_id: user.id, name, steps }] as any)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data[0])
}
