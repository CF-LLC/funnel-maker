import { z } from 'zod'

export const FIELD_TYPES = ['short_text', 'long_text', 'email', 'phone', 'dropdown', 'checkbox', 'date'] as const
export type FieldType = (typeof FIELD_TYPES)[number]
export const FIELD_LABELS: Record<FieldType, string> = {
  short_text: 'Short text', long_text: 'Long text', email: 'Email', phone: 'Phone', dropdown: 'Dropdown', checkbox: 'Checkbox', date: 'Date',
}
export const MAX_FIELDS = 10
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,59}$/

export const fieldSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]{1,40}$/i),
  type: z.enum(FIELD_TYPES),
  label: z.string().trim().min(1).max(100),
  required: z.boolean(),
  options: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
}).refine((f) => f.type !== 'dropdown' || (f.options?.length ?? 0) > 0, 'Dropdowns need at least one option')
export type Field = z.infer<typeof fieldSchema>

export const formSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(SLUG_RE, 'Form name: a-z, 0-9 and dashes'),
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500),
  submit_label: z.string().trim().min(1).max(40),
  fields: z.array(fieldSchema).max(MAX_FIELDS, `Up to ${MAX_FIELDS} fields`)
    .refine((fs) => new Set(fs.map((f) => f.id)).size === fs.length, 'Field ids must be unique'),
  published: z.boolean(),
})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+()\-.\s0-9]{5,30}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Server-side validation of a public submission against the form's fields. */
export function validateSubmission(fields: Field[], input: unknown): { ok: true; values: Record<string, string | boolean> } | { ok: false; error: string } {
  const data = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const values: Record<string, string | boolean> = {}
  for (const f of fields) {
    const raw = data[f.id]
    if (f.type === 'checkbox') {
      const v = raw === true || raw === 'true' || raw === 'on'
      if (f.required && !v) return { ok: false, error: `${f.label} is required` }
      values[f.id] = v
      continue
    }
    const v = typeof raw === 'string' ? raw.trim() : ''
    if (!v) { if (f.required) return { ok: false, error: `${f.label} is required` }; values[f.id] = ''; continue }
    const max = f.type === 'long_text' ? 5000 : 300
    if (v.length > max) return { ok: false, error: `${f.label} is too long` }
    if (f.type === 'email' && !EMAIL_RE.test(v)) return { ok: false, error: `${f.label}: enter a valid email` }
    if (f.type === 'phone' && !PHONE_RE.test(v)) return { ok: false, error: `${f.label}: enter a valid phone` }
    if (f.type === 'date' && (!DATE_RE.test(v) || isNaN(Date.parse(v)))) return { ok: false, error: `${f.label}: enter a valid date` }
    if (f.type === 'dropdown' && !(f.options || []).includes(v)) return { ok: false, error: `${f.label}: pick an option` }
    values[f.id] = v
  }
  return { ok: true, values }
}

const fmt = (v: unknown) => (v === true ? 'Yes' : v === false ? 'No' : v == null ? '' : String(v))

/** CSV with a formula-injection guard (cells starting with = + - @ get a leading quote). */
export function toCsv(fields: Field[], rows: { created_at: string; data: Record<string, unknown> }[]): string {
  const cell = (v: string) => {
    const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const head = ['Submitted at', ...fields.map((f) => f.label)].map(cell).join(',')
  const body = rows.map((r) => [r.created_at, ...fields.map((f) => fmt(r.data?.[f.id]))].map(cell).join(','))
  return [head, ...body].join('\r\n') + '\r\n'
}

/** mailto: to the user's own address with the response, so they can email themselves. */
export function responseMailto(to: string, formTitle: string, fields: Field[], r: { created_at: string; data: Record<string, unknown> }): string {
  const lines = fields.map((f) => `${f.label}: ${fmt(r.data?.[f.id])}`)
  const body = [`New response to "${formTitle}" (${r.created_at})`, '', ...lines].join('\n').slice(0, 1800)
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(`Form response: ${formTitle}`)}&body=${encodeURIComponent(body)}`
}

export const publicFormPath = (handle: string, slug: string) => `/@${handle}/${slug}`

/** Funnel embed: accepts "/@handle/form" (or full saasnation URL); returns the iframe src or undefined. */
export function formEmbedSrc(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const m = v.trim().match(/^(?:https:\/\/(?:funnels\.)?saasnation\.site)?\/@([a-z0-9][a-z0-9_-]{2,29})\/([a-z0-9][a-z0-9-]{0,59})\/?$/i)
  return m ? `/u/${m[1].toLowerCase()}/f/${m[2].toLowerCase()}?embed=1` : undefined
}
