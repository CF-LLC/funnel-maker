import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { sendWelcomeEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

// Only a signed-in user can trigger their own welcome email (no open relay).
// Sending is a no-op unless RESEND_API_KEY is configured (it is not in production).
export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ skipped: true })
  const result = await sendWelcomeEmail(user.email)
  if (!result.success) return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  return NextResponse.json({ success: true })
}
