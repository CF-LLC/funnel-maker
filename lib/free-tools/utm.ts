// UTM link building. Pure functions; unit-tested in tests/free-tools.test.cjs.
export type UtmParams = { source: string; medium: string; campaign: string; term?: string; content?: string }
export type BuildResult = { ok: true; url: string } | { ok: false; error: string }

export const UTM_PRESETS: { label: string; source: string; medium: string }[] = [
  { label: 'Google Ads', source: 'google', medium: 'cpc' },
  { label: 'Facebook ads', source: 'facebook', medium: 'paid_social' },
  { label: 'Instagram ads', source: 'instagram', medium: 'paid_social' },
  { label: 'Newsletter', source: 'newsletter', medium: 'email' },
  { label: 'X post', source: 'x', medium: 'social' },
  { label: 'LinkedIn post', source: 'linkedin', medium: 'social' },
  { label: 'YouTube', source: 'youtube', medium: 'video' },
  { label: 'Podcast', source: 'podcast', medium: 'audio' },
]

/** lowercase, trim, spaces/dashes -> underscore, drop anything odd. */
export function tidy(s: string): string {
  return s.trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_.]/g, '').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

export function normalizeUrl(input: string): { ok: true; url: URL } | { ok: false; error: string } {
  const raw = (input || '').trim()
  if (!raw) return { ok: false, error: 'Enter your website URL.' }
  if (/\s/.test(raw)) return { ok: false, error: 'URLs cannot contain spaces.' }
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : /^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^[^:]+:\d/.test(raw) ? raw : `https://${raw.replace(/^\/\//, '')}`
  let u: URL
  try { u = new URL(withScheme) } catch { return { ok: false, error: 'That does not look like a valid URL.' } }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, error: 'Use an http:// or https:// link.' }
  if (!u.hostname || (!u.hostname.includes('.') && u.hostname !== 'localhost')) return { ok: false, error: 'Add a full domain, like example.com.' }
  return { ok: true, url: u }
}

export function buildUtmUrl(website: string, p: UtmParams, opts: { tidy?: boolean } = {}): BuildResult {
  const n = normalizeUrl(website)
  if (!n.ok) return n
  const clean = (s: string | undefined) => (opts.tidy ? tidy(s || '') : (s || '').trim())
  const vals = { utm_source: clean(p.source), utm_medium: clean(p.medium), utm_campaign: clean(p.campaign), utm_term: clean(p.term), utm_content: clean(p.content) }
  if (!vals.utm_source) return { ok: false, error: 'Add a source (where the click comes from).' }
  if (!vals.utm_medium) return { ok: false, error: 'Add a medium (the type of channel).' }
  if (!vals.utm_campaign) return { ok: false, error: 'Add a campaign name.' }
  const u = n.url
  for (const [k, v] of Object.entries(vals)) {
    u.searchParams.delete(k)
    if (v) u.searchParams.set(k, v)
  }
  // URL keeps the original #hash after the query automatically.
  return { ok: true, url: u.toString() }
}

/** "source" or "source/medium" per line -> one link each, same campaign. */
export function buildMany(website: string, lines: string, base: UtmParams, opts: { tidy?: boolean } = {}) {
  return lines.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((line) => {
    const [source, medium] = line.split('/').map((x) => x.trim())
    const params = { ...base, source, medium: medium || base.medium }
    return { line, source: opts.tidy ? tidy(source) : source, medium: opts.tidy ? tidy(params.medium) : params.medium, result: buildUtmUrl(website, params, opts) }
  })
}
