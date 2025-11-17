import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function PUT(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { id, name, steps } = body

  const { data, error } = await (supabase
    .from('funnels') as any)
    .update({ name, steps })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data[0])
}
