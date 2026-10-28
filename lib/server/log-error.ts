// Server-only. Writes a row to public.app_errors (service role). Never throws; never logs secrets or request bodies.
import { serviceClient } from '@/lib/server/admin-client'

export async function logError(route: string, err: unknown, extra?: { userId?: string | null; detail?: Record<string, unknown> }): Promise<void> {
  try {
    const message = (err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error').slice(0, 500)
    await serviceClient().from('app_errors').insert({
      route: route.slice(0, 200),
      message,
      detail: extra?.detail ?? (err instanceof Error && err.name !== 'Error' ? { name: err.name } : null),
      user_id: extra?.userId ?? null,
    })
  } catch {
    // Logging must never break the request.
  }
}
