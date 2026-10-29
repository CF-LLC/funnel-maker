// "Get new tools as they ship" list. Pure helpers (tested) + the consent wording shown under the box.
export const UPDATES_CONSENT_TEXT = 'Email me when SaaS Nation launches a new tool. About one short email per new tool, no other marketing. Unsubscribe any time.'

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i
export function normalizeSignupEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const e = v.trim().toLowerCase()
  return e.length >= 6 && e.length <= 320 && EMAIL_RE.test(e) ? e : null
}

/** Only same-site paths are stored as the source page. */
export function cleanSourcePage(v: unknown): string {
  if (typeof v !== 'string' || !v.startsWith('/') || v.startsWith('//')) return '/'
  return v.split(/[?#]/)[0].replace(/[^A-Za-z0-9/_\-.@]/g, '').slice(0, 200) || '/'
}

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}
