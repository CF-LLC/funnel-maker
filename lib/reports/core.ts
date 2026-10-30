// Report kit: pure logic (no I/O). Tested in tests/reports.test.cjs.
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://saasnation.site').replace(/\/$/, '')
export const BUCKET = 'rp-files'
export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MAX_STORAGE_BYTES = 500 * 1024 * 1024
export const SIGNED_TTL_SECONDS = 120
export const MAX_CLIENTS = 200
export const MAX_REPORTS_PER_CLIENT = 120
export const MAX_KPIS = 12
export const MAX_SECTIONS = 20
export const MAX_SLOTS = 12
export const MAX_NOTES = 5000
export const DEMO_TOKEN = 'demo'
export const IMAGE_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg' }
/** v1 never sends email: the owner copies the link or opens their own mail app. */
export const REPORTS_SENDS_EMAIL = false

export type Format = 'number' | 'currency' | 'percent'
export type Kpi = { key: string; label: string; format: Format; better: 'up' | 'down' }
export type Section =
  | { type: 'title'; subtitle: string }
  | { type: 'kpis' }
  | { type: 'chart'; kpi: string; kind: 'bar' | 'line'; months: number }
  | { type: 'notes'; heading: string }
  | { type: 'images'; heading: string; slots: number }
export type Template = { kpis: Kpi[]; sections: Section[] }
export type Values = Record<string, number | null>
export type Client = { id: string; name: string; email: string | null; template: Template; token: string; revoked: boolean; last_viewed_at: string | null; view_count: number; created_at: string; updated_at: string }
export type Report = { id: string; client_id: string; month: string; title: string; layout: Template; kpi_values: Values; notes: string | null; shared: boolean; created_at: string; updated_at: string }
export type Image = { id: string; report_id: string; slot: number; name: string; mime: string; size_bytes: number; caption: string | null }

export const CLIENT_COLS = 'id, name, email, template, token, revoked, last_viewed_at, view_count, created_at, updated_at'
export const REPORT_COLS = 'id, client_id, month, title, layout, kpi_values, notes, shared, created_at, updated_at'
export const IMAGE_COLS = 'id, report_id, slot, name, mime, size_bytes, caption'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (s: unknown): s is string => typeof s === 'string' && UUID.test(s)
export const isToken = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-f]{64}$/.test(s)
export function newToken(): string {
  const b = new Uint8Array(32); globalThis.crypto.getRandomValues(b)
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}
export const clientUrl = (token: string, base = SITE) => `${base.replace(/\/$/, '')}/r/${token}`
export const cleanText = (s: unknown, max: number): string => (typeof s === 'string' ? s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : '')
export function cleanEmail(s: unknown): string | null {
  const e = typeof s === 'string' ? s.trim().toLowerCase() : ''
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 200 ? e : null
}

// ---------- months ----------
export const isMonth = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s)
export const monthDate = (ym: string) => `${ym}-01`
export const monthOf = (d: string) => d.slice(0, 7)
export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number); const t = y * 12 + (m - 1) + n
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`
}
export const monthLabel = (ym: string, style: 'long' | 'short' = 'long') =>
  new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 15)).toLocaleDateString('en-US', { month: style, year: style === 'long' ? 'numeric' : '2-digit', timeZone: 'UTC' })
export function thisMonth(now = new Date(), tz = 'America/Chicago'): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit' }).format(now).slice(0, 7)
}

// ---------- template ----------
const keyOf = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'kpi'
export function defaultTemplate(): Template {
  const kpis: Kpi[] = [
    { key: 'visitors', label: 'Website visitors', format: 'number', better: 'up' },
    { key: 'leads', label: 'New leads', format: 'number', better: 'up' },
    { key: 'conversion', label: 'Conversion rate', format: 'percent', better: 'up' },
    { key: 'revenue', label: 'Revenue', format: 'currency', better: 'up' },
  ]
  return { kpis, sections: [
    { type: 'title', subtitle: 'Monthly results' },
    { type: 'kpis' },
    { type: 'chart', kpi: 'leads', kind: 'bar', months: 6 },
    { type: 'notes', heading: 'What we did this month' },
    { type: 'images', heading: 'Screenshots', slots: 2 },
  ] }
}

/** Sanitize a template from the browser. Unknown fields are dropped; keys are unique slugs. */
export function parseTemplate(raw: any): { ok: true; template: Template } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Bad template.' }
  const kIn = Array.isArray(raw.kpis) ? raw.kpis : []
  if (kIn.length > MAX_KPIS) return { ok: false, error: `Up to ${MAX_KPIS} numbers per report.` }
  const kpis: Kpi[] = []; const seen = new Set<string>()
  for (const k of kIn) {
    const label = cleanText(k?.label, 60); if (!label) return { ok: false, error: 'Every number needs a name.' }
    let key = typeof k?.key === 'string' && /^[a-z0-9_]{1,40}$/.test(k.key) ? k.key : keyOf(label)
    for (let i = 2; seen.has(key); i++) key = `${keyOf(label).slice(0, 36)}_${i}`
    seen.add(key)
    kpis.push({ key, label, format: (['number', 'currency', 'percent'] as const).includes(k?.format) ? k.format : 'number', better: k?.better === 'down' ? 'down' : 'up' })
  }
  const sIn = Array.isArray(raw.sections) ? raw.sections : []
  if (sIn.length > MAX_SECTIONS) return { ok: false, error: `Up to ${MAX_SECTIONS} sections.` }
  const sections: Section[] = []
  for (const s of sIn) {
    switch (s?.type) {
      case 'title': sections.push({ type: 'title', subtitle: cleanText(s.subtitle, 120) }); break
      case 'kpis': sections.push({ type: 'kpis' }); break
      case 'chart': {
        const kpi = kpis.find((k) => k.key === s.kpi)?.key || kpis[0]?.key
        if (!kpi) break
        const months = Math.min(12, Math.max(2, Math.round(Number(s.months) || 6)))
        sections.push({ type: 'chart', kpi, kind: s.kind === 'line' ? 'line' : 'bar', months }); break
      }
      case 'notes': sections.push({ type: 'notes', heading: cleanText(s.heading, 80) || 'Notes' }); break
      case 'images': {
        const used = sections.reduce((n, x) => n + (x.type === 'images' ? x.slots : 0), 0)
        const slots = Math.min(MAX_SLOTS - used, Math.max(1, Math.round(Number(s.slots) || 1)))
        if (slots > 0) sections.push({ type: 'images', heading: cleanText(s.heading, 80) || 'Screenshots', slots }); break
      }
    }
  }
  if (!sections.length) return { ok: false, error: 'Add at least one section.' }
  return { ok: true, template: { kpis, sections } }
}
/** Image slot numbers for each images section, in order (0-based across the report). */
export function slotRanges(t: Template): { index: number; start: number; slots: number }[] {
  let at = 0; const out: { index: number; start: number; slots: number }[] = []
  t.sections.forEach((s, i) => { if (s.type === 'images') { out.push({ index: i, start: at, slots: s.slots }); at += s.slots } })
  return out
}
export const totalSlots = (t: Template) => slotRanges(t).reduce((n, r) => n + r.slots, 0)

// ---------- numbers ----------
/** "1,234.50", "$1,200", "12.5%", "(300)" → number. Empty → null. Bad → undefined. */
export function parseNumber(s: unknown): number | null | undefined {
  if (s == null) return null
  if (typeof s === 'number') return Number.isFinite(s) && Math.abs(s) < 1e13 ? s : undefined
  let t = String(s).trim(); if (!t) return null
  let neg = false
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1) }
  t = t.replace(/[\s$€£,%]/g, '')
  if (!/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(t)) return undefined
  const n = Number(t) * (neg ? -1 : 1)
  return Number.isFinite(n) && Math.abs(n) < 1e13 ? n : undefined
}
export function parseValues(raw: any, kpis: Kpi[]): { ok: true; values: Values } | { ok: false; error: string } {
  const values: Values = {}
  for (const k of kpis) {
    const v = parseNumber(raw?.[k.key])
    if (v === undefined) return { ok: false, error: `“${k.label}” needs a number.` }
    values[k.key] = v
  }
  return { ok: true, values }
}

/** Minimal RFC 4180 CSV reader (quotes, escaped quotes, CRLF). */
export function readCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let f = ''; let q = false
  const s = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++ } else q = false } else f += c; continue }
    if (c === '"') q = true
    else if (c === ',' || c === ';' || c === '\t') { row.push(f); f = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = '' }
    else f += c
  }
  if (f || row.length) { row.push(f); rows.push(row) }
  return rows.filter((r) => r.some((x) => x.trim()))
}
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
/**
 * Accepts either "metric,value" rows (first column = name) or a header row of names with one value row
 * (the last row wins). Matches by label or key, ignoring case and punctuation.
 */
export function valuesFromCsv(text: string, kpis: Kpi[]): { values: Values; matched: string[]; unknown: string[]; error?: string } {
  if (text.length > 200_000) return { values: {}, matched: [], unknown: [], error: 'That CSV is too big (200 KB max).' }
  const rows = readCsv(text)
  const find = (name: string) => { const n = norm(name); return n ? kpis.find((k) => norm(k.label) === n || norm(k.key) === n) : undefined }
  const values: Values = {}; const matched: string[] = []; const unknown: string[] = []
  const put = (name: string, raw: string) => {
    const k = find(name); if (!k) { if (name.trim() && !/^(metric|name|kpi|value)$/i.test(name.trim())) unknown.push(name.trim().slice(0, 40)); return }
    const v = parseNumber(raw); if (v === undefined || v === null) return
    values[k.key] = v; if (!matched.includes(k.key)) matched.push(k.key)
  }
  if (!rows.length) return { values, matched, unknown, error: 'That CSV is empty.' }
  const headerHits = rows[0].filter((h) => find(h)).length
  if (rows.length >= 2 && headerHits >= Math.max(1, Math.min(2, rows[0].length))) {
    const last = rows[rows.length - 1]
    rows[0].forEach((h, i) => put(h, last[i] ?? ''))
  } else for (const r of rows) if (r.length >= 2) put(r[0], r[1])
  if (!matched.length) return { values, matched, unknown, error: 'No numbers matched. Use your number names as the first column (or as the header row).' }
  return { values, matched, unknown }
}

export function fmtValue(v: number | null | undefined, f: Format): string {
  if (v == null) return '—'
  if (f === 'currency') return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: Math.abs(v) >= 1000 ? 0 : 2 })
  if (f === 'percent') return `${v.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`
  return v.toLocaleString('en-US', { maximumFractionDigits: 2 })
}
export type Change = { delta: number; pct: number | null; dir: 'up' | 'down' | 'flat'; good: boolean | null; label: string }
/** Month-over-month change; percent KPIs show the point difference ("+1.2 pts"). */
export function momChange(cur: number | null | undefined, prev: number | null | undefined, k: Pick<Kpi, 'format' | 'better'>): Change | null {
  if (cur == null || prev == null) return null
  const delta = Math.round((cur - prev) * 100) / 100
  const dir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  const pct = prev === 0 ? null : Math.round(((cur - prev) / Math.abs(prev)) * 1000) / 10
  const good = dir === 'flat' ? null : (dir === 'up') === (k.better === 'up')
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : ''
  const label = dir === 'flat' ? 'No change' : k.format === 'percent' ? `${sign}${Math.abs(delta).toLocaleString('en-US', { maximumFractionDigits: 1 })} pts`
    : pct == null ? `${sign}${fmtValue(Math.abs(delta), k.format)}` : `${sign}${Math.abs(pct).toLocaleString('en-US', { maximumFractionDigits: 1 })}%`
  return { delta, pct, dir, good, label }
}
export function previousReport<T extends Pick<Report, 'month'>>(reports: T[], month: string): T | null {
  const m = monthDate(isMonth(month) ? month : monthOf(month))
  return reports.filter((r) => r.month < m).sort((a, b) => b.month.localeCompare(a.month))[0] || null
}
/** Up to n months ending at `month` (oldest first), null where there's no report or no value. */
export function kpiSeries(reports: Pick<Report, 'month' | 'kpi_values'>[], key: string, month: string, n: number): { month: string; value: number | null }[] {
  const by = new Map(reports.map((r) => [monthOf(r.month), r.kpi_values?.[key] ?? null]))
  const end = isMonth(month) ? month : monthOf(month)
  return Array.from({ length: n }, (_, i) => { const m = addMonths(end, i - n + 1); return { month: m, value: by.has(m) ? (by.get(m) as number | null) : null } })
}
/** Shared geometry for the web SVG and the PDF chart. */
export function chartGeometry(series: { value: number | null }[], w: number, h: number, pad = 4) {
  const vals = series.map((s) => s.value).filter((v): v is number => v != null)
  const max = Math.max(0, ...vals), min = Math.min(0, ...vals)
  const span = max - min || 1
  const slot = (w - pad * 2) / Math.max(1, series.length)
  const y = (v: number) => pad + (h - pad * 2) * (1 - (v - min) / span)
  const zero = y(0)
  const bars = series.map((s, i) => {
    const x = pad + i * slot + slot * 0.18, bw = slot * 0.64
    if (s.value == null) return null
    const top = Math.min(y(s.value), zero), bh = Math.max(1, Math.abs(y(s.value) - zero))
    return { x, y: top, w: bw, h: bh, cx: x + bw / 2, cy: y(s.value) }
  })
  return { bars, zero, max, min }
}

/** New month from the client's saved template, carrying nothing but the layout (numbers start blank). */
export function newReportRow(client: Pick<Client, 'name' | 'template'>, month: string) {
  return { month: monthDate(month), title: `${client.name}: ${monthLabel(month)}`.slice(0, 160), layout: client.template, kpi_values: {}, notes: '', shared: false }
}
/** Duplicate an existing report into a new month: same layout and notes structure, numbers blank, images not copied. */
export function duplicateRow(src: Pick<Report, 'layout' | 'title' | 'month'>, month: string) {
  const title = src.title.includes(monthLabel(monthOf(src.month))) ? src.title.replace(monthLabel(monthOf(src.month)), monthLabel(month)) : `${src.title} (${monthLabel(month)})`
  return { month: monthDate(month), title: title.slice(0, 160), layout: src.layout, kpi_values: {}, notes: '', shared: false }
}

export function mailtoInvite(email: string | null, clientName: string, owner: string, url: string): string {
  const first = clientName.split(/\s+/)[0] || 'there'
  const body = `Hi ${first},\n\nYour monthly report from ${owner} is ready:\n${url}\n\nNo login needed; just keep this link to yourself. You can also download it as a PDF from that page.`
  return `mailto:${encodeURIComponent(email || '')}?subject=${encodeURIComponent(`Your monthly report from ${owner}`)}&body=${encodeURIComponent(body)}`
}

// ---------- one view model for the web page, the owner preview and the PDF ----------
export type ViewImage = { slot: number; url: string | null; caption: string | null }
export type ViewSection =
  | { type: 'title'; title: string; subtitle: string; month: string }
  | { type: 'kpis'; cards: { kpi: Kpi; value: number | null; text: string; change: Change | null; prevMonth: string | null }[] }
  | { type: 'chart'; kpi: Kpi; kind: 'bar' | 'line'; series: { month: string; value: number | null }[] }
  | { type: 'notes'; heading: string; text: string }
  | { type: 'images'; heading: string; images: (ViewImage | null)[] }
export function reportView(report: Pick<Report, 'month' | 'title' | 'layout' | 'kpi_values' | 'notes'>, all: Pick<Report, 'month' | 'kpi_values'>[], images: ViewImage[]): ViewSection[] {
  const ym = monthOf(report.month)
  const prev = previousReport(all, ym)
  const prevYm = prev ? monthOf(prev.month) : null
  const byKey = new Map(report.layout.kpis.map((k) => [k.key, k]))
  const ranges = slotRanges(report.layout)
  const merged = [...all.filter((r) => monthOf(r.month) !== ym), { month: report.month, kpi_values: report.kpi_values }]
  return report.layout.sections.flatMap((s, i): ViewSection[] => {
    switch (s.type) {
      case 'title': return [{ type: 'title', title: report.title, subtitle: s.subtitle, month: ym }]
      case 'kpis': return [{ type: 'kpis', cards: report.layout.kpis.map((k) => {
        const v = report.kpi_values?.[k.key] ?? null
        // Only compare with the month right before, so a gap never pretends to be "month over month".
        const p = prevYm === addMonths(ym, -1) ? prev?.kpi_values?.[k.key] ?? null : null
        return { kpi: k, value: v, text: fmtValue(v, k.format), change: momChange(v, p, k), prevMonth: p == null ? null : prevYm }
      }) }]
      case 'chart': { const k = byKey.get(s.kpi); return k ? [{ type: 'chart', kpi: k, kind: s.kind, series: kpiSeries(merged, k.key, ym, s.months) }] : [] }
      case 'notes': return report.notes?.trim() ? [{ type: 'notes', heading: s.heading, text: report.notes }] : []
      case 'images': {
        const r = ranges.find((x) => x.index === i)!
        const imgs = Array.from({ length: r.slots }, (_, j) => images.find((im) => im.slot === r.start + j) || null)
        return imgs.some(Boolean) ? [{ type: 'images', heading: s.heading, images: imgs }] : []
      }
    }
  })
}
export const pdfFileName = (client: string, ym: string) => `report-${client.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'client'}-${ym}.pdf`
