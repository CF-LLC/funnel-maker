import { NextResponse } from 'next/server'
import { DIGEST_ENABLED } from '@/lib/digest'

// Weekly digest trigger: BUILT DISABLED. Even with DIGEST_EMAILS_ENABLED=true there is no sender wired yet,
// so this never sends email. It exists so the schedule can be added later after approval.
export async function GET() {
  return NextResponse.json({ disabled: true, enabledFlag: DIGEST_ENABLED, sent: 0 }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
}
