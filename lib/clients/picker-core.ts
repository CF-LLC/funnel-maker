// PR 2 (SaaS Nation rework): pure helpers for the "Pick a client" search in Invoices and Proposals.
// Options come from the same email-derived client list /crm builds. Email is the only key (shared normalizer).
import { clientEmail } from '@/lib/clients/email'

export type PickerClient = { name: string; email: string; company: string }

/** CRM contacts -> picker options: valid normalized email only, deduped by email, sorted by name. */
export function toPickerOptions(contacts: ReadonlyArray<{ email?: unknown; name?: unknown; company?: unknown; archivedAt?: unknown; archived_at?: unknown }>): PickerClient[] {
  const seen = new Map<string, PickerClient>()
  for (const c of contacts || []) {
    if (c?.archivedAt || c?.archived_at) continue
    const email = clientEmail(c?.email)
    if (!email || seen.has(email)) continue
    const name = typeof c.name === 'string' ? c.name.trim() : ''
    const company = typeof c.company === 'string' ? c.company.trim() : ''
    seen.set(email, { name, email, company })
  }
  return [...seen.values()].sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))
}

/** Case-insensitive search over name, email and company. Empty query = first `limit`. */
export function filterPicker(opts: PickerClient[], q: string, limit = 8): PickerClient[] {
  const s = (q || '').trim().toLowerCase()
  const hit = s ? opts.filter((o) => o.name.toLowerCase().includes(s) || o.email.includes(s) || o.company.toLowerCase().includes(s)) : opts
  return hit.slice(0, limit)
}

/** A saved inv_clients row with the same normalized email, if any (never matched by name). */
export function matchSaved<T extends { id: string; email?: string | null }>(saved: ReadonlyArray<T>, email: string): T | null {
  const e = clientEmail(email)
  if (!e) return null
  return saved.find((s) => clientEmail(s.email) === e) || null
}
