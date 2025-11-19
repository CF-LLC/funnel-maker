import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { sendTeamInviteEmail } from '@/lib/email'
import crypto from 'crypto'

export async function GET(
  request: Request,
  context: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await context.params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get members
  const { data: members, error } = await (supabase
    .from('org_members') as any)
    .select('*, user:users(email)')
    .eq('org_id', orgId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ members })
}

export async function POST(
  request: Request,
  context: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await context.params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { email, role } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Get organization details
    const { data: org } = await (supabase
      .from('organizations') as any)
      .select('name')
      .eq('id', orgId)
      .single()

    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

    // Create invitation
    const { data: invitation, error: inviteError } = await (supabase
      .from('invitations') as any)
      .insert({
        org_id: orgId,
        email,
        role: role || 'member',
        invited_by: user.id,
        token,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 })
    }

    // Get inviter details
    const { data: userData } = await (supabase
      .from('users') as any)
      .select('email')
      .eq('id', user.id)
      .single()

    // Send invitation email
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`
    await sendTeamInviteEmail(email, org.name, inviteLink, userData.email)

    return NextResponse.json({ invitation })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await context.params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId } = await request.json()

    // Remove member
    const { error } = await (supabase
      .from('org_members') as any)
      .delete()
      .eq('id', memberId)
      .eq('org_id', orgId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
