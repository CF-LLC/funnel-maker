// QR code payloads + rendering, 100% in the browser (qrcode-generator, MIT, no deps). Never calls a QR API.
import qrcode from 'qrcode-generator'
import { normalizeUrl } from '@/lib/free-tools/utm'

export type Ecl = 'L' | 'M' | 'Q' | 'H'
export type QrKind = 'url' | 'text' | 'wifi' | 'email' | 'phone' | 'vcard'
export type QrFields = {
  url?: string; text?: string
  ssid?: string; password?: string; security?: 'WPA' | 'WEP' | 'nopass'; hidden?: boolean
  email?: string; subject?: string; body?: string
  phone?: string
  firstName?: string; lastName?: string; org?: string; title?: string; vPhone?: string; vEmail?: string; website?: string
}
export type Payload = { ok: true; data: string } | { ok: false; error: string }

const wifiEsc = (s: string) => s.replace(/([\\;,:"])/g, '\\$1')
const vEsc = (s: string) => s.trim().replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')

export function buildPayload(kind: QrKind, f: QrFields): Payload {
  switch (kind) {
    case 'url': {
      const n = normalizeUrl(f.url || '')
      return n.ok ? { ok: true, data: n.url.toString() } : n
    }
    case 'text':
      return f.text && f.text.length ? { ok: true, data: f.text } : { ok: false, error: 'Type some text.' }
    case 'wifi': {
      if (!f.ssid?.trim()) return { ok: false, error: 'Add the network name (SSID).' }
      const sec = f.security || 'WPA'
      if (sec !== 'nopass' && !f.password) return { ok: false, error: 'Add the Wi-Fi password, or pick “No password”.' }
      const pw = sec === 'nopass' ? '' : `P:${wifiEsc(f.password || '')};`
      return { ok: true, data: `WIFI:T:${sec};S:${wifiEsc(f.ssid)};${pw}${f.hidden ? 'H:true;' : ''};` }
    }
    case 'email': {
      const to = (f.email || '').trim()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { ok: false, error: 'Enter a valid email address.' }
      const q = [f.subject ? `subject=${encodeURIComponent(f.subject)}` : '', f.body ? `body=${encodeURIComponent(f.body)}` : ''].filter(Boolean).join('&')
      return { ok: true, data: `mailto:${to}${q ? `?${q}` : ''}` }
    }
    case 'phone': {
      const p = (f.phone || '').replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '')
      return p.replace('+', '').length >= 3 ? { ok: true, data: `tel:${p}` } : { ok: false, error: 'Enter a phone number.' }
    }
    case 'vcard': {
      const fn = [f.firstName, f.lastName].map((x) => (x || '').trim()).filter(Boolean).join(' ')
      if (!fn && !f.org?.trim()) return { ok: false, error: 'Add a name or company.' }
      const L = ['BEGIN:VCARD', 'VERSION:3.0', `N:${vEsc(f.lastName || '')};${vEsc(f.firstName || '')};;;`, `FN:${vEsc(fn || f.org || '')}`]
      if (f.org?.trim()) L.push(`ORG:${vEsc(f.org)}`)
      if (f.title?.trim()) L.push(`TITLE:${vEsc(f.title)}`)
      if (f.vPhone?.trim()) L.push(`TEL;TYPE=CELL:${f.vPhone.replace(/[^\d+]/g, '')}`)
      if (f.vEmail?.trim()) L.push(`EMAIL:${f.vEmail.trim()}`)
      if (f.website?.trim()) { const n = normalizeUrl(f.website); if (n.ok) L.push(`URL:${n.url.toString()}`) }
      L.push('END:VCARD')
      return { ok: true, data: L.join('\r\n') }
    }
  }
}

/** UTF-8 encode so the library's byte mode (which keeps the low 8 bits per char) gets real UTF-8 bytes. */
export function toByteString(s: string): string {
  return Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join('')
}

export type Matrix = { size: number; dark: boolean[][] }
export function makeMatrix(data: string, ecl: Ecl = 'M'): Matrix {
  const q = qrcode(0, ecl)
  q.addData(toByteString(data), 'Byte')
  q.make()
  const size = q.getModuleCount()
  const dark = Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => q.isDark(r, c)))
  return { size, dark }
}

/** Crisp SVG with one path; margin in modules. */
export function matrixToSvg(m: Matrix, o: { fg: string; bg: string; margin: number; px: number }): string {
  const total = m.size + o.margin * 2
  let d = ''
  for (let r = 0; r < m.size; r++) for (let c = 0; c < m.size; c++) if (m.dark[r][c]) d += `M${c + o.margin} ${r + o.margin}h1v1h-1z`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${o.px}" height="${o.px}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${o.bg}"/><path fill="${o.fg}" d="${d}"/></svg>`
}

/** RGBA pixels (for canvas/PNG and for decoder tests). Integer pixels per module. */
export function matrixToRgba(m: Matrix, o: { fg: string; bg: string; margin: number; px: number }) {
  const total = m.size + o.margin * 2
  const scale = Math.max(1, Math.floor(o.px / total))
  const w = total * scale
  const fg = hexToRgb(o.fg) || [0, 0, 0], bg = hexToRgb(o.bg) || [255, 255, 255]
  const px = new Uint8ClampedArray(w * w * 4)
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
    const r = Math.floor(y / scale) - o.margin, c = Math.floor(x / scale) - o.margin
    const on = r >= 0 && c >= 0 && r < m.size && c < m.size && m.dark[r][c]
    const col = on ? fg : bg, i = (y * w + x) * 4
    px[i] = col[0]; px[i + 1] = col[1]; px[i + 2] = col[2]; px[i + 3] = 255
  }
  return { width: w, height: w, data: px }
}

export function hexToRgb(h: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(h.trim())
  if (!m) return null
  const s = m[1].length === 3 ? m[1].split('').map((x) => x + x).join('') : m[1]
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)) as [number, number, number]
}
const lum = ([r, g, b]: number[]) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
export function contrastRatio(a: string, b: string): number {
  const x = hexToRgb(a), y = hexToRgb(b); if (!x || !y) return 1
  const [l1, l2] = [lum(x), lum(y)].sort((p, q) => q - p); return (l1 + 0.05) / (l2 + 0.05)
}
/** null = fine; otherwise a plain warning. */
export function contrastWarning(fg: string, bg: string): string | null {
  const x = hexToRgb(fg), y = hexToRgb(bg)
  if (!x || !y) return 'Use hex colors like #111111.'
  if (lum(x) > lum(y)) return 'Light code on a dark background: many phone cameras will not scan it. Use a dark foreground on a light background.'
  if (contrastRatio(fg, bg) < 4) return `Contrast is low (${contrastRatio(fg, bg).toFixed(1)}:1). It may not scan; aim for 4:1 or more.`
  return null
}
