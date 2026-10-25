import { createServerClient } from '@/lib/supabase'
import { isDemoUser } from '@/lib/demo'
import { isStatus, type Status } from '@/lib/dataremoval/core'
import { Tracker } from '@/components/dataremoval/tracker'
import { Disclaimer } from '@/components/dataremoval/disclaimer'

export const dynamic = 'force-dynamic'

export default async function DataRemovalTracker() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const demo = isDemoUser(user!.id)
  const db = supabase as any
  const [{ data: profile }, { data: rows }] = demo ? [{ data: null }, { data: [] }] : await Promise.all([
    db.from('dr_profiles').select('full_name').eq('user_id', user!.id).maybeSingle(),
    db.from('dr_status').select('broker_id, status, updated_at').eq('user_id', user!.id),
  ])
  const statuses: Record<string, { status: Status; updated_at: string }> = {}
  for (const r of rows || []) if (isStatus(r.status)) statuses[r.broker_id] = { status: r.status, updated_at: r.updated_at }
  return (
    <div className="space-y-8">
      <Tracker demo={demo} email={user!.email ?? ''} initialName={profile?.full_name ?? ''} initialStatuses={statuses} />
      <Disclaimer />
    </div>
  )
}
