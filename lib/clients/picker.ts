// Server loader for the client picker. Returns undefined unless workspace_v2 is on for this user
// (undefined = editors render exactly as before). Reads only; never writes or copies rows.
import { createServerClient } from '@/lib/supabase'
import { isDemoUser } from '@/lib/demo'
import { hasAccess } from '@/lib/access'
import { isUserFlagEnabled } from '@/lib/flags'
import { loadContacts } from '@/lib/crm/load'
import { toPickerOptions, type PickerClient } from '@/lib/clients/picker-core'

export async function loadPickerClients(): Promise<PickerClient[] | undefined> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || isDemoUser(user.id)) return undefined
    if (!(await isUserFlagEnabled('workspace_v2', user.id))) return undefined
    if (!(await hasAccess(user, 'crm'))) return undefined
    return toPickerOptions(await loadContacts(user.id))
  } catch {
    return undefined
  }
}
