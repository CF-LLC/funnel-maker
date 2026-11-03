// Server-only. Reads the GLOBAL `homepage_v2` row with the service role (fm_public_flag only exposes *_public keys).
import { serviceClient } from '@/lib/server/admin-client'
import { HOMEPAGE_V2_FLAG, homepageV2On } from './v2'

export async function isHomepageV2Enabled(): Promise<boolean> {
  try {
    const { data, error } = await serviceClient().from('feature_flags').select('enabled').eq('key', HOMEPAGE_V2_FLAG).maybeSingle()
    return !error && homepageV2On(data as any)
  } catch {
    return false
  }
}
