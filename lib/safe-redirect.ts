/**
 * Returns a same-origin relative path (path + query + hash) or the fallback.
 * Rejects absolute URLs, protocol-relative (//host), backslash tricks, and control characters,
 * so it can't be used as an open redirect.
 */
export function safeReturnPath(raw: unknown, fallback = '/dashboard'): string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2000) return fallback
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\') || /[\u0000-\u001f\u007f]/.test(raw)) return fallback
  try {
    const base = 'https://same-origin.invalid'
    const url = new URL(raw, base)
    if (url.origin !== base) return fallback
    const out = url.pathname + url.search + url.hash
    // Normalization can turn '/..//host' into '//host'; reject anything that isn't a single-slash path.
    if (!out.startsWith('/') || out.startsWith('//') || out.includes('\\')) return fallback
    return out
  } catch {
    return fallback
  }
}
