// Add client: pure validation for the "Add client" form (no I/O; unit-tested).
// Saves into the shared client record (crm_contacts, keyed by user_id + normalized email).
import { clientEmail } from '@/lib/clients/email'

export type AddClientInput = { name: string; email: string; company: string | null; phone: string | null }
export type AddClientResult = { ok: true; value: AddClientInput } | { ok: false; field: 'name' | 'email' | 'company' | 'phone' | 'form'; error: string }

export const PHONE_RE = /^[0-9+().\-\s/x#ext]*$/i
export const DUPLICATE_MSG = 'You already have a client with that email'

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : v == null ? '' : null)

/** Server-side validation. Unknown keys (e.g. user_id) are ignored: the owner always comes from the session. */
export function validateAddClient(body: unknown): AddClientResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, field: 'form', error: 'Invalid request.' }
  const b = body as Record<string, unknown>
  const name = str(b.name), rawEmail = str(b.email), company = str(b.company), phone = str(b.phone)
  if (name === null || !name) return { ok: false, field: 'name', error: 'Please enter the client’s name.' }
  if (name.length > 200) return { ok: false, field: 'name', error: 'The name can be up to 200 characters.' }
  if (rawEmail === null || !rawEmail) return { ok: false, field: 'email', error: 'Please enter the client’s email.' }
  const email = clientEmail(rawEmail)
  if (!email) return { ok: false, field: 'email', error: 'That email address looks invalid. Check it and try again.' }
  if (company === null || company.length > 200) return { ok: false, field: 'company', error: 'The company name can be up to 200 characters.' }
  if (phone === null || phone.length > 50) return { ok: false, field: 'phone', error: 'The phone number can be up to 50 characters.' }
  if (!PHONE_RE.test(phone) || (phone && !/\d/.test(phone))) return { ok: false, field: 'phone', error: 'The phone number can only use digits, spaces and + ( ) - .' }
  return { ok: true, value: { name, email, company: company || null, phone: phone || null } }
}
