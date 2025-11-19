import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  try {
    // Get invitation
    const { data: invitation, error: inviteError } = await (supabase
      .from('invitations') as any)
      .select('*, organization:organizations(name)')
      .eq('token', token)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation expired' }, { status: 400 })
    }

    // Check if email matches
    const { data: userData } = await (supabase
      .from('users') as any)
      .select('email')
      .eq('id', user.id)
      .single()

    if (userData.email !== invitation.email) {
      return NextResponse.json(
        { error: 'This invitation is for a different email address' },
        { status: 403 }
      )
    }

    // Add user to organization
    await (supabase
      .from('org_members') as any)
      .insert({
        org_id: invitation.org_id,
        user_id: user.id,
        role: invitation.role,
      })

    // Delete invitation
    await (supabase
      .from('invitations') as any)
      .delete()
      .eq('id', invitation.id)

    return NextResponse.redirect(new URL('/dashboard/organizations', request.url))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
