import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get organizations where user is owner
    const { data: ownedOrgs, error: ownedError } = await (supabase
      .from('organizations') as any)
      .select(`
        *,
        owner:users!organizations_owner_id_fkey(email)
      `)
      .eq('owner_id', user.id)

    // Get organizations where user is a member
    const { data: memberOrgs, error: memberError } = await (supabase
      .from('org_members') as any)
      .select(`
        org_id,
        role,
        organization:organizations(*)
      `)
      .eq('user_id', user.id)

    const organizations = [
      ...(ownedOrgs || []).map(org => ({ ...org, org_members: [{ role: 'owner' }] })),
      ...(memberOrgs || []).map(m => ({ ...m.organization, org_members: [{ role: m.role }] }))
    ]

    return NextResponse.json({ organizations })
  } catch (error: any) {
    console.error('Error fetching organizations:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
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
