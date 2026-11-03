// The one client-email normalizer for the client page (PR 1). Trim + lowercase, then validate.
// Every read that links a tool row to a client goes through clientEmail(). Never match by name.
import { normEmail } from '@/lib/crm/core'

export const clientEmail = (v: unknown): string | null => normEmail(v)

/** True when both values normalize to the same valid email. Null/invalid never matches. */
export function sameClient(a: unknown, b: unknown): boolean {
  const x = clientEmail(a)
  return !!x && x === clientEmail(b)
}

/** Escape LIKE wildcards so ilike() is an exact, case-insensitive match. */
export const likeExact = (email: string) => email.replace(/[\\%_]/g, (m) => '\\' + m)
