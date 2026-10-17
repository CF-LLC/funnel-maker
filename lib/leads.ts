export type LeadInput = {
  name: string
  email: string
  phone: string
  message: string
  template: string
  utm: Record<string, string>
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'tpl']
export const TEMPLATES = ['book-call', 'sales-page', 'free-download'] as const

function str(v: unknown, max: number): string | null {
  if (v === undefined || v === null) return ''
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length > max ? null : t
}

/** Validate a public lead submission. Returns the clean lead or an error message. */
export function validateLead(body: unknown): { ok: true; lead: LeadInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid body' }
  const b = body as Record<string, unknown>
  const name = str(b.name, 200)
  const email = str(b.email, 320)
  const phone = str(b.phone, 50)
  const message = str(b.message, 2000)
  const template = str(b.template, 50)
  if (name === null || email === null || phone === null || message === null || template === null)
    return { ok: false, error: 'Field too long or wrong type' }
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'A valid email is required' }
  if (phone && !/^[0-9+().\-\s]{5,50}$/.test(phone)) return { ok: false, error: 'Invalid phone' }
  if (template && !(TEMPLATES as readonly string[]).includes(template)) return { ok: false, error: 'Invalid template' }
  const utm: Record<string, string> = {}
  if (b.utm && typeof b.utm === 'object') {
    for (const k of UTM_KEYS) {
      const v = (b.utm as Record<string, unknown>)[k]
      if (typeof v === 'string' && v.length <= 200) utm[k] = v
    }
  }
  return { ok: true, lead: { name, email: email.toLowerCase(), phone, message, template, utm } }
}

function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
  // Neutralize spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function leadsToCsv(rows: Record<string, unknown>[]): string {
  const cols = ['created_at', 'name', 'email', 'phone', 'message', 'template', 'utm']
  return [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\r\n') + '\r\n'
}
