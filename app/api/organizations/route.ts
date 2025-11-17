import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get organizations where user is owner or member
  const { data: orgs, error } = await (supabase
    .from('organizations') as any)
    .select(`
      *,
      org_members!inner(role),
      owner:users!organizations_owner_id_fkey(email)
    `)
    .or(`owner_id.eq.${user.id},org_members.user_id.eq.${user.id}`)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ organizations: orgs })
}

export async function POST(request: Request) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Organization name is required' }, { status: 400 })
    }

    // Create organization
    const { data: org, error: orgError } = await (supabase
      .from('organizations') as any)
      .insert({
        name,
        owner_id: user.id,
      })
      .select()
      .single()

    if (orgError) {
      return NextResponse.json({ error: orgError.message }, { status: 500 })
    }

    // Add owner as member with owner role
    await (supabase
      .from('org_members') as any)
      .insert({
        org_id: org.id,
        user_id: user.id,
        role: 'owner',
      })

    return NextResponse.json({ organization: org })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
