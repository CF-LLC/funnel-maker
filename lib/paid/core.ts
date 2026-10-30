// Paid?: match bank-CSV credits to open invoices. Everything here runs in the browser (and in tests); the bank file
// and its rows never leave the page. Only a confirmed match (invoice id, amount, date, confidence, short payer text
// with long digit runs removed, optional note) is sent to the server.

export type Mapping = { date: string; description: string; amount?: string; credit?: string; debit?: string; dateOrder?: 'mdy' | 'dmy' }
export type Credit = { key: string; row: number; date: string; description: string; amountCents: number }
export type OpenInvoice = { id: string; number: string; client_name: string; total: number; currency: string; due_date: string; issue_date: string }
export type Tier = 'exact' | 'likely' | 'possible' | 'unmatched'
export type Suggestion = { credit: Credit; tier: Tier; invoice: OpenInvoice | null; reasons: string[]; alternatives: OpenInvoice[] }

export const MAX_FILE_BYTES = 5 * 1024 * 1024
export const MAX_ROWS = 5000
export const TIERS: Tier[] = ['exact', 'likely', 'possible', 'unmatched']
export const TIER_LABEL: Record<Tier, string> = { exact: 'Exact', likely: 'Likely', possible: 'Possible', unmatched: 'No match' }
const RANK: Record<Tier, number> = { exact: 0, likely: 1, possible: 2, unmatched: 3 }

/** RFC-4180-ish CSV: quotes, escaped quotes, CRLF, and ; or tab delimiters when that's what the header uses. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '')
  const first = src.split(/\r?\n/, 1)[0] || ''
  const counts = [',', ';', '\t'].map((d) => [d, first.split(d).length] as const).sort((a, b) => b[1] - a[1])
  const delim = counts[0][1] > 1 ? counts[0][0] : ','
  const rows: string[][] = []; let row: string[] = []; let f = ''; let q = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (q) {
      if (c === '"') { if (src[i + 1] === '"') { f += '"'; i++ } else q = false } else f += c
    } else if (c === '"') q = true
    else if (c === delim) { row.push(f); f = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && src[i + 1] === '\n') i++; row.push(f); f = ''; if (row.some((x) => x.trim())) rows.push(row); row = [] }
    else f += c
  }
  row.push(f); if (row.some((x) => x.trim())) rows.push(row)
  return rows.map((r) => r.map((x) => x.trim()))
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
/** Best guess at which header is which; the owner can change it and it's remembered. */
export function guessMapping(headers: string[]): Mapping {
  const find = (...res: RegExp[]) => headers.find((h) => res.some((r) => r.test(h.toLowerCase()))) || ''
  const credit = find(/^credit/, /deposit/, /money in/, /paid in/)
  const debit = find(/^debit/, /withdraw/, /money out/, /paid out/)
  const amount = credit ? '' : find(/^amount/, /amount/, /value/)
  return { date: find(/^date$/, /posted/, /transaction date/, /date/), description: find(/desc/, /payee/, /narrative/, /details/, /memo/, /name/, /reference/), amount: amount || undefined, credit: credit || undefined, debit: debit || undefined, dateOrder: 'mdy' }
}
export function cleanMapping(m: unknown, headers?: string[]): Mapping | null {
  if (!m || typeof m !== 'object') return null
  const o = m as Record<string, unknown>
  const s = (v: unknown) => (typeof v === 'string' && v.length <= 80 && (!headers || headers.includes(v)) ? v : '')
  const out: Mapping = { date: s(o.date), description: s(o.description), dateOrder: o.dateOrder === 'dmy' ? 'dmy' : 'mdy' }
  if (s(o.amount)) out.amount = s(o.amount)
  if (s(o.credit)) out.credit = s(o.credit)
  if (s(o.debit)) out.debit = s(o.debit)
  return out
}
export const mappingReady = (m: Mapping) => !!(m.date && m.description && (m.amount || m.credit))

/** "$1,234.50", "1.234,50"? (no: we treat , as thousands), "(12.00)", "-12", "12.00 CR" → cents. */
export function parseAmount(raw: string): number | null {
  let s = (raw || '').trim(); if (!s) return null
  let neg = false
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1) }
  if (/\bdr\b/i.test(s)) neg = true
  s = s.replace(/\b(cr|dr)\b/gi, '').replace(/[$£€\s,]/g, '')
  if (s.endsWith('-')) { neg = true; s = s.slice(0, -1) }
  if (s.startsWith('-')) { neg = !neg; s = s.slice(1) } else if (s.startsWith('+')) s = s.slice(1)
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  const c = Math.round(Number(s) * 100)
  return neg ? -c : c
}
/** ISO, M/D/YYYY (or D/M with dmy), YYYY/MM/DD, and "Oct 3, 2026" → YYYY-MM-DD. */
export function parseDate(raw: string, order: 'mdy' | 'dmy' = 'mdy'): string | null {
  const s = (raw || '').trim()
  const iso = (y: number, m: number, d: number) => {
    if (y < 100) y += 2000
    const dt = new Date(Date.UTC(y, m - 1, d))
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? dt.toISOString().slice(0, 10) : null
  }
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/); if (m) return iso(+m[1], +m[2], +m[3])
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/); if (m) return order === 'dmy' ? iso(+m[3], +m[2], +m[1]) : iso(+m[3], +m[1], +m[2])
  const t = Date.parse(s); if (!Number.isNaN(t) && /[a-z]{3}/i.test(s)) { const d = new Date(t); return iso(d.getFullYear(), d.getMonth() + 1, d.getDate()) }
  return null
}

/** Credits only (money in). Debits, zero rows and unreadable rows are skipped and counted. */
export function extractCredits(rows: string[][], m: Mapping): { credits: Credit[]; skipped: { debits: number; unreadable: number } } {
  const [head, ...body] = rows; const idx = (h?: string) => (h ? head.indexOf(h) : -1)
  const di = idx(m.date), xi = idx(m.description), ai = idx(m.amount), ci = idx(m.credit), bi = idx(m.debit)
  const credits: Credit[] = []; const skipped = { debits: 0, unreadable: 0 }
  body.slice(0, MAX_ROWS).forEach((r, i) => {
    const date = parseDate(r[di] || '', m.dateOrder)
    let cents: number | null = null
    if (ci >= 0) {
      const c = parseAmount(r[ci] || '')
      if (c && c > 0) cents = c
      else if (c === null && !(r[ci] || '').trim() && bi >= 0 && (r[bi] || '').trim()) { skipped.debits++; return }
      else if (c !== null && c < 0) { skipped.debits++; return }
    } else if (ai >= 0) {
      const a = parseAmount(r[ai] || '')
      if (a !== null && a <= 0) { skipped.debits++; return }
      cents = a
    }
    if (!date || !cents) { skipped.unreadable++; return }
    const description = (r[xi] || '').replace(/\s+/g, ' ').slice(0, 300)
    credits.push({ key: `${i}:${date}:${cents}`, row: i + 2, date, description, amountCents: cents })
  })
  return { credits, skipped }
}

/** The only bank-derived text ever sent: ≤40 chars, digit runs of 6+ removed (account/reference numbers). */
export function safePayer(desc: string): string | null {
  const s = (desc || '').replace(/\d[\d\s-]{4,}\d/g, (x) => (x.replace(/\D/g, '').length >= 6 ? ' ' : x)).replace(/\d{6,}/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40).trim()
  return s || null
}

const numIn = (num: string, desc: string) => { const n = norm(num); if (n.length < 2) return false; const d = norm(desc); if (d.includes(n)) return true; const digits = num.replace(/\D/g, ''); return digits.length >= 3 && new RegExp(`(^|\\D)0*${digits.replace(/^0+/, '')}(\\D|$)`).test(desc) }
const STOP = new Set(['the', 'and', 'inc', 'llc', 'ltd', 'co', 'company', 'corp', 'group', 'studio'])
const nameIn = (name: string, desc: string) => {
  const d = ' ' + desc.toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' '
  const full = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); if (full.length >= 3 && d.includes(' ' + full + ' ')) return true
  const words = full.split(' ').filter((w) => w.length >= 4 && !STOP.has(w))
  return words.length > 0 && words.some((w) => d.includes(' ' + w + ' '))
}

function score(c: Credit, inv: OpenInvoice, tol: number): { tier: Tier; reasons: string[] } {
  const diff = Math.abs(c.amountCents - inv.total)
  const amt = diff === 0 ? 'exact' : diff <= tol ? 'near' : 'no'
  const num = numIn(inv.number, c.description), name = nameIn(inv.client_name, c.description)
  const reasons = [amt === 'exact' ? 'Amount matches' : amt === 'near' ? `Amount within ${(tol / 100).toFixed(2)}` : '', num ? `Mentions ${inv.number}` : '', name ? `Mentions ${inv.client_name}` : ''].filter(Boolean)
  let tier: Tier = 'unmatched'
  if (amt === 'exact' && (num || name)) tier = 'exact'
  else if ((amt === 'exact') || (amt === 'near' && (num || name)) || (num && name)) tier = 'likely'
  else if (amt === 'near' || num || name) tier = 'possible'
  return { tier, reasons }
}

/** Best invoice per credit; each invoice is suggested once (strongest credit wins); ambiguous amount-only ties drop a tier. */
export function matchCredits(credits: Credit[], invoices: OpenInvoice[], toleranceCents = 0): Suggestion[] {
  const tol = Math.max(0, Math.min(10000, Math.round(toleranceCents || 0)))
  const cands = credits.map((c) => {
    const s = invoices.map((inv) => ({ inv, ...score(c, inv, tol) })).filter((x) => x.tier !== 'unmatched')
      .sort((a, b) => RANK[a.tier] - RANK[b.tier] || b.reasons.length - a.reasons.length || Math.abs(c.amountCents - a.inv.total) - Math.abs(c.amountCents - b.inv.total) || a.inv.due_date.localeCompare(b.inv.due_date))
    return { c, s }
  })
  const order = cands.map((x, i) => ({ i, r: x.s[0] ? RANK[x.s[0].tier] * 10 - x.s[0].reasons.length : 99 })).sort((a, b) => a.r - b.r)
  const taken = new Set<string>(); const out: Suggestion[] = new Array(cands.length)
  for (const { i } of order) {
    const { c, s } = cands[i]
    const free = s.filter((x) => !taken.has(x.inv.id))
    const best = free[0]
    if (!best) { out[i] = { credit: c, tier: 'unmatched', invoice: null, reasons: [], alternatives: [] }; continue }
    let tier = best.tier
    const tie = free[1] && free[1].tier === best.tier && free[1].reasons.length === best.reasons.length && free[1].inv.total === best.inv.total
    if (tie && tier !== 'possible') tier = tier === 'exact' ? 'likely' : 'possible'
    taken.add(best.inv.id)
    out[i] = { credit: c, tier, invoice: best.inv, reasons: tie ? [...best.reasons, 'Other invoices match too'] : best.reasons, alternatives: free.slice(1, 6).map((x) => x.inv) }
  }
  return out.sort((a, b) => RANK[a.tier] - RANK[b.tier] || b.credit.date.localeCompare(a.credit.date))
}

export function cleanNote(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.replace(/\s+/g, ' ').trim().slice(0, 120) : null
}
export const isISODate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && parseDate(v) === v
export const CONFIDENCES = ['exact', 'likely', 'possible', 'manual'] as const
export type Confidence = (typeof CONFIDENCES)[number]
export const paidNote = (paidOn: string) => `Marked paid via Paid? (${paidOn})`
